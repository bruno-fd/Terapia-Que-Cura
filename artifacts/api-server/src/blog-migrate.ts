import { pool } from "@workspace/db";
import { logger } from "./lib/logger";

// ============================================================
// Migração manual das partes que o `db:push` do Drizzle NÃO cria:
//   1. Extensões pg_trgm e pgvector (precisam existir ANTES do push criar a
//      coluna vector de blog_post_index).
//   2. Índices especiais em blog_post_index: GIN(trgm) em title_normalized e
//      HNSW (ou ivfflat) em embedding.
//
// Idempotente. Ordem recomendada de deploy:
//   pnpm --filter @workspace/api-server run blog-migrate   (cria extensões)
//   pnpm --filter @workspace/db run push                   (cria tabelas/coluna)
//   pnpm --filter @workspace/api-server run blog-migrate   (cria índices)
// Rodar duas vezes é seguro: cada passo usa IF NOT EXISTS / try-catch.
// ============================================================

async function tabelaExiste(nome: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    "select to_regclass($1) is not null as exists",
    [nome],
  );
  return rows[0]?.exists === true;
}

async function main(): Promise<void> {
  // 1) Extensões.
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
  logger.info("Extensão vector garantida.");
  await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  logger.info("Extensão pg_trgm garantida.");

  // 2) Índices (só se a tabela já foi criada pelo db:push).
  if (!(await tabelaExiste("blog_post_index"))) {
    logger.warn(
      "Tabela blog_post_index ainda não existe. Rode `db:push` e depois execute blog-migrate de novo para criar os índices.",
    );
    return;
  }

  await pool.query(
    "CREATE INDEX IF NOT EXISTS blog_post_index_title_trgm ON blog_post_index USING gin (title_normalized gin_trgm_ops)",
  );
  logger.info("Índice GIN(trgm) em title_normalized garantido.");

  // HNSW é o preferido (funciona em tabela vazia). Se a versão do pgvector não
  // suportar, tenta ivfflat (que exige dados para construir as listas).
  try {
    await pool.query(
      "CREATE INDEX IF NOT EXISTS blog_post_index_embedding_hnsw ON blog_post_index USING hnsw (embedding vector_cosine_ops)",
    );
    logger.info("Índice HNSW em embedding garantido.");
  } catch (err) {
    logger.warn(
      { err },
      "HNSW indisponível; tentando ivfflat (precisa de dados na tabela).",
    );
    try {
      await pool.query(
        "CREATE INDEX IF NOT EXISTS blog_post_index_embedding_ivf ON blog_post_index USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)",
      );
      logger.info("Índice ivfflat em embedding garantido.");
    } catch (err2) {
      logger.warn(
        { err: err2 },
        "Não foi possível criar índice vetorial agora (rode de novo após indexar o corpus).",
      );
    }
  }
}

main()
  .catch((err) => {
    logger.error({ err }, "Falha na migração do blog.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
