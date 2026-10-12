import { MACRO_NOMES, subcategoriasDe } from "./categorias";
import { minerarMacro } from "./keyword-research";
import { enfileirarSugestoes, macrosComFila } from "./keyword-queue";
import { logger } from "./logger";

// ============================================================
// Runner de mineração para rodar DENTRO do app (endpoint interno).
//
// Espelha o padrão do gerador diário (rodarProximaCategoria): minera UMA
// macrocategoria por chamada e informa quantas ainda faltam, para o despertador
// (ou o agente) chamar repetidamente até remaining=0. Roda no app principal,
// então escreve no próprio banco de produção, o que contorna a limitação de
// "banco de produção só-leitura" das ferramentas externas.
//
// Dois modos:
//   - Sem categoria: minera a próxima macro que ainda NÃO tem fila (bootstrap).
//   - Com categoria: força a mineração daquela macro (refresh/atualização),
//     mesmo que já tenha fila. Serve para a mineração recorrente futura.
// ============================================================

export interface ResultadoMineracao {
  processed: string | null;
  novas: number;
  reforcadas: number;
  ignoradas: number;
  remaining: number;
}

// Quantas macros ainda não têm fila (para o remaining do modo bootstrap).
async function faltamMinerar(): Promise<number> {
  const comFila = await macrosComFila();
  return Array.from(MACRO_NOMES).filter((m) => !comFila.has(m)).length;
}

export async function rodarProximaMineracao(
  categoryParam?: string,
): Promise<ResultadoMineracao> {
  let category: string | null = null;

  if (categoryParam) {
    // Modo força: minera exatamente a macro pedida (refresh).
    if (!MACRO_NOMES.has(categoryParam)) {
      throw new Error(`Macrocategoria desconhecida: ${categoryParam}`);
    }
    category = categoryParam;
  } else {
    // Modo bootstrap: a próxima macro que ainda não tem fila.
    const comFila = await macrosComFila();
    category = Array.from(MACRO_NOMES).find((m) => !comFila.has(m)) ?? null;
  }

  if (!category) {
    // Nada a minerar (todas já têm fila). Barato: não chama o Autocomplete.
    return { processed: null, novas: 0, reforcadas: 0, ignoradas: 0, remaining: 0 };
  }

  const subs = subcategoriasDe(category);
  logger.info({ category, subs: subs.length }, "Minerando macro (endpoint).");
  const sugestoes = await minerarMacro(category, subs);
  const { novas, reforcadas, ignoradas } = await enfileirarSugestoes(
    category,
    sugestoes,
  );

  // No modo força, remaining reflete só o bootstrap (macros sem fila); depois
  // de forçar, a macro já tinha/tem fila, então remaining tende a 0.
  const remaining = await faltamMinerar();

  logger.info(
    { category, novas, reforcadas, ignoradas, remaining },
    "Mineração da macro concluída (endpoint).",
  );
  return { processed: category, novas, reforcadas, ignoradas, remaining };
}
