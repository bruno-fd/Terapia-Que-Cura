import { pool } from "@workspace/db";
import { SEEDS } from "./lib/blog-seeds";
import { minerarEixo } from "./lib/mine-runner";
import { enfileirarCandidatos, estatisticasFila } from "./lib/keyword-queue";
import type { CandidatoKeyword } from "./lib/mine-runner";
import { logger } from "./lib/logger";

// ============================================================
// CLI de mineração (calibração + população da fila).
//
//   pnpm --filter @workspace/api-server run mine-keywords            -> todos os eixos
//   pnpm --filter @workspace/api-server run mine-keywords "Ansiedade e Estresse"
//   ... --dry   -> só imprime, não grava na fila
//
// Sempre imprime as top buscas mineradas (confira "a olho" antes de gerar posts).
// ============================================================

function parseArgs(): { macros: string[]; dry: boolean } {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const macros = args.filter((a) => !a.startsWith("--"));
  return { macros, dry };
}

async function main(): Promise<void> {
  const { macros, dry } = parseArgs();
  const eixos =
    macros.length > 0
      ? SEEDS.filter((e) => macros.includes(e.macro))
      : SEEDS;

  if (eixos.length === 0) {
    logger.warn({ macros }, "Nenhum eixo correspondente às sementes.");
    return;
  }

  const todos: CandidatoKeyword[] = [];
  for (const eixo of eixos) {
    const candidatos = await minerarEixo(eixo);
    todos.push(...candidatos);

    // Top 20 do eixo, priority depois score.
    const top = [...candidatos]
      .sort((a, b) => b.priority - a.priority || b.score - a.score)
      .slice(0, 20);
    console.log(`\n===== ${eixo.macro} (${candidatos.length} candidatos) =====`);
    for (const c of top) {
      console.log(
        `  [${c.lang}] p${c.priority} s${c.score} ${c.isQuestion ? "?" : " "} ${c.query}`,
      );
    }
  }

  if (!dry) {
    const r = await enfileirarCandidatos(todos);
    const stats = await estatisticasFila();
    console.log(
      `\nFila atualizada: +${r.inseridos} novos, ${r.atualizados} somados, ${r.pulados} pulados (já cobertos).`,
    );
    console.log(
      `Fila total: ${stats.pending} pendentes, ${stats.used} usados, ${stats.skipped} pulados.`,
    );
  } else {
    console.log("\n(--dry: nada foi gravado na fila.)");
  }
}

main()
  .catch((err) => {
    logger.error({ err }, "Falha na mineração.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
