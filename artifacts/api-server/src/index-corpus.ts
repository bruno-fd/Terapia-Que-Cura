import { pool } from "@workspace/db";
import { indexarCorpus } from "./lib/corpus-index";
import { logger } from "./lib/logger";

// ============================================================
// CLI: (re)indexa o corpus de posts publicados em blog_post_index (Passo 0 da
// anti-canibalização). Idempotente. Rode uma vez após a migração e sempre que
// quiser reconstruir o índice.
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
