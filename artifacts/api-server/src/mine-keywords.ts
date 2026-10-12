import { pool } from "@workspace/db";
import { MACRO_NOMES, subcategoriasDe } from "./lib/categorias";
import { minerarMacro } from "./lib/keyword-research";
import { enfileirarSugestoes } from "./lib/keyword-queue";
import { logger } from "./lib/logger";

// ============================================================
// CLI de mineração de palavras-chave (Fase 0 — teste isolado).
//
// Percorre as macrocategorias (todas, ou uma passada por argumento), minera as
// sugestões do Google Autocomplete para cada subcategoria e as grava na fila
// blog_keyword_queue. Imprime as top perguntas encontradas para você conferir a
// olho a QUALIDADE da mineração antes de conectar isso ao gerador (Fase 1).
//
// Uso (a partir de artifacts/api-server):
//   pnpm run mine-keywords
//   pnpm run mine-keywords "Ansiedade e Estresse"
//
// É seguro rodar quantas vezes quiser: idempotente por query_normalized.
// NÃO gera post nenhum e NÃO toca no fluxo diário atual.
// ============================================================

async function main(): Promise<void> {
  const arg = process.argv[2]?.trim();
  const macros = arg ? [arg] : Array.from(MACRO_NOMES);

  if (arg && !MACRO_NOMES.has(arg)) {
    logger.error(
      { macro: arg, validas: Array.from(MACRO_NOMES) },
      "Macrocategoria desconhecida. Passe exatamente um dos nomes válidos.",
    );
    return;
  }

  logger.info({ total: macros.length }, "Iniciando mineração de palavras-chave.");

  let totalNovas = 0;

  for (const macro of macros) {
    const subs = subcategoriasDe(macro);
    logger.info({ macro, subcategorias: subs.length }, "Minerando macro.");

    const sugestoes = await minerarMacro(macro, subs);
    const { novas, reforcadas, ignoradas } = await enfileirarSugestoes(
      macro,
      sugestoes,
    );
    totalNovas += novas;

    // Amostra visível para conferência manual da qualidade.
    const topPerguntas = sugestoes
      .filter((s) => s.isQuestion)
      .slice(0, 12)
      .map((s) => `    [${s.score}] ${s.query}`);
    const topTermos = sugestoes
      .filter((s) => !s.isQuestion)
      .slice(0, 8)
      .map((s) => `    [${s.score}] ${s.query}`);

    console.log(`\n===== ${macro} =====`);
    console.log(
      `mineradas=${sugestoes.length}  novas=${novas}  reforcadas=${reforcadas}  ignoradas(já cobertas)=${ignoradas}`,
    );
    console.log("  Perguntas (ótimas para H2/FAQ):");
    console.log(topPerguntas.join("\n") || "    (nenhuma)");
    console.log("  Termos fortes (bons para H1):");
    console.log(topTermos.join("\n") || "    (nenhum)");
  }

  logger.info(
    { macros: macros.length, totalNovas },
    "Mineração concluída.",
  );
}

main()
  .catch((err) => {
    logger.error({ err }, "Erro fatal na mineração de palavras-chave.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
