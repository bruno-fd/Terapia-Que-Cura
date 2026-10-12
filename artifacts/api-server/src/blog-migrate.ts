import { pool } from "@workspace/db";
import { migrarSchemaBlog } from "./lib/blog-schema-migrate";
import { logger } from "./lib/logger";

// ============================================================
// CLI: cria as extensões + a tabela blog_post_index + os índices (SQL
// idempotente). Em produção prefira o endpoint POST /internal/blog/migrate
// (o banco é só-leitura para as ferramentas externas). Este CLI é para dev.
//   pnpm --filter @workspace/api-server run blog-migrate
// ============================================================

async function main(): Promise<void> {
  const { steps } = await migrarSchemaBlog();
  for (const s of steps) console.log(s);
}

main()
  .catch((err) => {
    logger.error({ err }, "Falha na migração do blog.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
