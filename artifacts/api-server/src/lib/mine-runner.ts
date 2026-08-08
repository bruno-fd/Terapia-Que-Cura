import {
  minerarSemente,
  normalizar,
  type Lang,
  type Sugestao,
} from "./keyword-research";
import { filtrarLexical } from "./keyword-filter";
import { filtrarSemantico } from "./semantic-filter";
import { SEEDS, type ClusterSeed, type EixoSeed } from "./blog-seeds";
import { logger } from "./logger";

// ============================================================
// Orquestra a mineracao: expande as sementes de um cluster (pt + ingles),
// minera o autocomplete, aplica o filtro lexical e depois o semantico, e devolve
// candidatos prontos para enfileirar (sem tocar no banco).
// ============================================================

export interface CandidatoKeyword {
  query: string;
  macro: string;
  subcategoria: string | null;
  isQuestion: boolean;
  score: number;
  priority: number;
  lang: Lang;
  source: "autocomplete";
}

// Stopwords que nao servem como raiz de relevancia.
const STOP = new Set([
  "o",
  "a",
  "os",
  "as",
  "de",
  "da",
  "do",
  "que",
  "e",
  "em",
  "com",
  "para",
  "the",
  "of",
  "to",
  "in",
  "is",
]);

// Raizes de uma semente: tokens normalizados com 4+ caracteres, fora as
// stopwords. Usadas para checar relevancia das sugestoes.
function raizesDe(termos: string[]): string[] {
  const raizes = new Set<string>();
  for (const termo of termos) {
    for (const tok of normalizar(termo).split(/\s+/)) {
      if (tok.length >= 4 && !STOP.has(tok)) raizes.add(tok);
    }
  }
  return Array.from(raizes);
}

// Minera um cluster (subcategoria) inteiro: todas as sementes pt + ingles.
export async function minerarCluster(
  macro: string,
  cluster: ClusterSeed,
): Promise<CandidatoKeyword[]> {
  const priority = cluster.priority ?? 0;
  const agregado = new Map<string, Sugestao>();

  const raizesPt = raizesDe(cluster.termos);
  for (const termo of cluster.termos) {
    const m = await minerarSemente(termo, "pt", raizesPt);
    for (const [q, s] of m) {
      const atual = agregado.get(q);
      if (atual) atual.score += s.score;
      else agregado.set(q, { ...s });
    }
  }

  if (cluster.ingles && cluster.ingles.length > 0) {
    const raizesEn = raizesDe(cluster.ingles);
    for (const termo of cluster.ingles) {
      const m = await minerarSemente(termo, "en", raizesEn);
      for (const [q, s] of m) {
        const atual = agregado.get(q);
        if (atual) atual.score += s.score;
        else agregado.set(q, { ...s });
      }
    }
  }

  // Filtro lexical (barato) primeiro, para nao gastar embeddings com ruido.
  const lexicais = Array.from(agregado.values()).filter(
    (s) => filtrarLexical(s.query).ok,
  );

  // Filtro semantico contrastivo (usa a subcategoria como contexto de tema).
  const semanticos = await filtrarSemantico(
    lexicais,
    `${cluster.subcategoria} (${macro})`,
  );

  return semanticos.map((s) => ({
    query: s.query,
    macro,
    subcategoria: cluster.subcategoria,
    isQuestion: s.isQuestion,
    score: Math.round(s.score),
    priority,
    lang: s.lang,
    source: "autocomplete" as const,
  }));
}

// Minera um eixo (macrocategoria) inteiro: todos os clusters.
export async function minerarEixo(eixo: EixoSeed): Promise<CandidatoKeyword[]> {
  logger.info({ macro: eixo.macro, clusters: eixo.clusters.length }, "Minerando eixo.");
  const todos: CandidatoKeyword[] = [];
  for (const cluster of eixo.clusters) {
    const candidatos = await minerarCluster(eixo.macro, cluster);
    todos.push(...candidatos);
    logger.info(
      { macro: eixo.macro, cluster: cluster.subcategoria, candidatos: candidatos.length },
      "Cluster minerado.",
    );
  }
  return todos;
}

// Minera um eixo pelo nome da macro (conveniencia para CLI/endpoint).
export async function minerarPorMacro(
  macro: string,
): Promise<CandidatoKeyword[]> {
  const eixo = SEEDS.find((e) => e.macro === macro);
  if (!eixo) {
    logger.warn({ macro }, "Macro sem sementes; nada a minerar.");
    return [];
  }
  return minerarEixo(eixo);
}
