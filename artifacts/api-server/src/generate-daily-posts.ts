import { pool } from "@workspace/db";
import { MACRO_NOMES } from "./lib/categorias";
import {
  processarCategoriaSegura,
  type RunStatus,
} from "./lib/daily-generator";
import { logger } from "./lib/logger";

// ============================================================
// CLI do gerador diário de posts do blog.
//
// Toda a lógica de geração vive em ./lib/daily-generator.ts (compartilhada com
// o endpoint interno de disparo). Aqui é só o comando de linha: percorre todas
// as macrocategorias em sequência, uma por vez. Idempotente por categoria (pula
// as que já rodaram hoje). Usado para teste manual e como comando único.
// ============================================================

async function main(): Promise<void> {
  const categorias = Array.from(MACRO_NOMES);
  logger.info(
    { total: categorias.length },
    "Iniciando geração diária de posts.",
  );

  const contagem: Record<RunStatus, number> = {
    published: 0,
    rejected: 0,
    skipped: 0,
    failed: 0,
  };

  // Sequencial de propósito: mais gentil com os limites de taxa da IA.
  for (const category of categorias) {
    const status = await processarCategoriaSegura(category);
    contagem[status] += 1;
  }

  logger.info(
    { ...contagem, total: categorias.length },
    "Geração diária concluída.",
  );
}

main()
  .catch((err) => {
    logger.error({ err }, "Erro fatal no gerador diário.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
