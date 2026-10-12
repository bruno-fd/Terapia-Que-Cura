import { pool } from "@workspace/db";
import { limparFilaIrrelevante } from "./lib/keyword-queue";
import { logger } from "./lib/logger";

// ============================================================
// Limpeza da fila de palavras-chave (curadoria automática em massa).
//
// Passa o filtro de relevância (keyword-filter.ts) por toda a fila pendente e
// descarta (status "skipped") os temas ruidosos/off-topic: séries, pdf,
// espanhol/inglês, remédios, autores acadêmicos, temas médicos fora do escopo,
// burocracia, anos, sobras da sopa de letrinhas. É seguro rodar quantas vezes
// quiser (idempotente) e NÃO apaga nada: só muda o status para "skipped", então
// dá para auditar depois o que foi descartado.
//
// Uso (a partir de artifacts/api-server):
//   pnpm run clean-keyword-queue
// ============================================================

async function main(): Promise<void> {
  logger.info("Limpando a fila: descartando temas irrelevantes.");
  const { analisadas, descartadas } = await limparFilaIrrelevante();
  const mantidas = analisadas - descartadas;
  console.log(
    `\nFila analisada: ${analisadas} pendentes\n` +
      `  descartadas (ruído): ${descartadas}\n` +
      `  mantidas (relevantes): ${mantidas}`,
  );
  logger.info({ analisadas, descartadas, mantidas }, "Limpeza concluída.");
}

main()
  .catch((err) => {
    logger.error({ err }, "Erro na limpeza da fila.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
