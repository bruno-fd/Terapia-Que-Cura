import { pool } from "@workspace/db";
import { logger } from "./logger";

// ============================================================
// Migração idempotente do schema de anti-canibalização, em SQL puro.
//
// Por que SQL e não `drizzle-kit push`: neste ambiente o push abre prompt
// interativo (drift não relacionado em outra tabela) e o shell não tem TTY.
// Além disso, o banco de produção é só-leitura para as ferramentas externas,
// então a ESCRITA precisa acontecer de dentro do app (endpoint interno). Esta
// função roda tanto pelo CLI (dev) quanto pelo endpoint /internal/blog/migrate.
//
// Tudo com IF NOT EXISTS: seguro rodar quantas vezes quiser.
//
// O DDL aqui PRECISA bater com a definição Drizzle em
// lib/db/src/schema/blog-post-index.ts.
// ============================================================

export async function migrarSchemaBlog(): Promise<{ steps: string[] }> {
  const steps: string[] = [];
  const run = async (label: string, sql: string): Promise<boolean> => {
    try {
      await pool.query(sql);
      steps.push(`ok: ${label}`);
      return true;
    } catch (err) {
      steps.push(`erro: ${label}: ${err instanceof Error ? err.message : String(err)}`);
      logger.warn({ err, label }, "Passo da migração do blog falhou.");
      return false;
    }
  };

  // Extensões (pgvector + pg_trgm). Disponíveis, mas precisam ser instaladas.
  await run("CREATE EXTENSION vector", "CREATE EXTENSION IF NOT EXISTS vector");
  await run("CREATE EXTENSION pg_trgm", "CREATE EXTENSION IF NOT EXISTS pg_trgm");

  // Tabela do índice do corpus (aditiva; referencia blog_posts).
  await run(
    "CREATE TABLE blog_post_index",
    `CREATE TABLE IF NOT EXISTS blog_post_index (
       post_id integer PRIMARY KEY REFERENCES blog_posts(id) ON DELETE CASCADE,
       title_normalized text NOT NULL,
       embedded_text text NOT NULL DEFAULT '',
       embedding vector(1024),
       updated_at timestamptz NOT NULL DEFAULT now()
     )`,
  );

  // Coluna da ENTIDADE (título sem o molde). Aditiva; recalibragem da Camada 1.
  await run(
    "ALTER TABLE add entity_normalized",
    "ALTER TABLE blog_post_index ADD COLUMN IF NOT EXISTS entity_normalized text NOT NULL DEFAULT ''",
  );

  // Índice trigrama sobre o título (mantido) e sobre a entidade (novo alvo da
  // Camada 1 lexical).
  await run(
    "CREATE INDEX title_trgm (gin)",
    "CREATE INDEX IF NOT EXISTS blog_post_index_title_trgm ON blog_post_index USING gin (title_normalized gin_trgm_ops)",
  );
  await run(
    "CREATE INDEX entity_trgm (gin)",
    "CREATE INDEX IF NOT EXISTS blog_post_index_entity_trgm ON blog_post_index USING gin (entity_normalized gin_trgm_ops)",
  );

  // Índice vetorial (Camada 2 semântica). HNSW funciona em tabela vazia; se a
  // versão do pgvector não suportar, tenta ivfflat (precisa de dados).
  const hnswOk = await run(
    "CREATE INDEX embedding_hnsw",
    "CREATE INDEX IF NOT EXISTS blog_post_index_embedding_hnsw ON blog_post_index USING hnsw (embedding vector_cosine_ops)",
  );
  if (!hnswOk) {
    await run(
      "CREATE INDEX embedding_ivfflat (fallback)",
      "CREATE INDEX IF NOT EXISTS blog_post_index_embedding_ivf ON blog_post_index USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)",
    );
  }

  return { steps };
}
