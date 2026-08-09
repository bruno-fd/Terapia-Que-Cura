import { pool } from "@workspace/db";
import { indexarCorpus } from "./lib/corpus-index";
import { logger } from "./lib/logger";

// ============================================================
// CLI: (re)indexa o corpus de posts publicados em blog_post_index
// (anti-canibalização + citação cruzada). Em produção prefira o endpoint
// POST /internal/blog/reindex-corpus. Idempotente.
//   pnpm --filter @workspace/api-server run index-corpus
// ============================================================

async function main(): Promise<void> {
  const { indexados } = await indexarCorpus();
  console.log(`Corpus indexado: ${indexados} post(s).`);
}

main()
  .catch((err) => {
    logger.error({ err }, "Falha ao indexar o corpus.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
