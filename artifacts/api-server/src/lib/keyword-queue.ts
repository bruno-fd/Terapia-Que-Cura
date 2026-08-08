import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { db, blogKeywordQueueTable, type BlogKeywordRow } from "@workspace/db";
import type { CandidatoKeyword } from "./mine-runner";
import { coberturaLexical } from "./corpus-index";
import { logger } from "./logger";

// ============================================================
// Persistencia idempotente da fila de buscas.
//
//   - Dedup por query_normalized: re-minerar SOMA o score e mantem a maior
//     priority (onConflictDoUpdate).
//   - Anti-canibalizacao Camada 1 no ENFILEIRAR: se ja ha post cobrindo a
//     busca, grava como "skipped" com ponteiro para o post (auditoria), em vez
//     de enfileirar como pendente.
//   - Consolidacao por CLUSTER (subcategoria): o post e por cluster, nao por
//     busca. A busca mais forte vira H1; as irmas viram H2/FAQ; ao gerar, o
//     cluster inteiro e marcado como usado.
// ============================================================

export interface ResultadoEnfileiramento {
  inseridos: number;
  atualizados: number;
  pulados: number; // ja cobertos por post existente
}

// Enfileira candidatos minerados. Idempotente. Roda o checkpoint C1 (cobertura
// lexical) por candidato novo.
export async function enfileirarCandidatos(
  candidatos: CandidatoKeyword[],
): Promise<ResultadoEnfileiramento> {
  let inseridos = 0;
  let atualizados = 0;
  let pulados = 0;

  for (const c of candidatos) {
    const queryNormalized = c.query; // ja normalizado no minerador

    // Ja existe na fila? Entao so soma score / mantem maior priority.
    const [existente] = await db
      .select({ id: blogKeywordQueueTable.id })
      .from(blogKeywordQueueTable)
      .where(eq(blogKeywordQueueTable.queryNormalized, queryNormalized));

    if (existente) {
      await db
        .update(blogKeywordQueueTable)
        .set({
          score: sql`${blogKeywordQueueTable.score} + ${c.score}`,
          priority: sql`GREATEST(${blogKeywordQueueTable.priority}, ${c.priority})`,
        })
        .where(eq(blogKeywordQueueTable.id, existente.id));
      atualizados++;
      continue;
    }

    // Novo: checkpoint C1 (cobertura lexical contra o corpus).
    const cobertoPor = await coberturaLexical(c.query);
    const status = cobertoPor ? "skipped" : "pending";
    if (cobertoPor) pulados++;
    else inseridos++;

    await db.insert(blogKeywordQueueTable).values({
      query: c.query,
      queryNormalized,
      macro: c.macro,
      subcategoria: c.subcategoria,
      isQuestion: c.isQuestion,
      score: c.score,
      priority: c.priority,
      lang: c.lang,
      source: c.source,
      status,
      skipReason: cobertoPor
        ? `Ja coberto pelo post ${cobertoPor} (canibalizacao lexical).`
        : null,
      usedPostId: cobertoPor ?? null,
    });
  }

  logger.info(
    { inseridos, atualizados, pulados, total: candidatos.length },
    "Candidatos enfileirados.",
  );
  return { inseridos, atualizados, pulados };
}

export interface ClusterSelecionado {
  macro: string;
  subcategoria: string | null;
  buscaAlvo: string; // query mais forte do cluster (vira o H1)
  isQuestionAlvo: boolean;
  langAlvo: "pt" | "en";
  irmas: string[]; // demais queries do cluster (viram H2/FAQ)
  perguntasIrmas: string[]; // subconjunto de irmas que sao perguntas
  rowIds: number[]; // todas as linhas do cluster (a marcar como usadas)
}

function montarCluster(linhas: BlogKeywordRow[]): ClusterSelecionado {
  const topo = linhas[0];
  const irmas = linhas.slice(1).map((l) => l.query);
  const perguntasIrmas = linhas
    .slice(1)
    .filter((l) => l.isQuestion)
    .map((l) => l.query);
  return {
    macro: topo.macro,
    subcategoria: topo.subcategoria,
    buscaAlvo: topo.query,
    isQuestionAlvo: topo.isQuestion,
    langAlvo: (topo.lang === "en" ? "en" : "pt"),
    irmas,
    perguntasIrmas,
    rowIds: linhas.map((l) => l.id),
  };
}

// Seleciona o cluster pendente mais forte (priority desc, score desc). Se
// `macro` e passado, restringe a ela. Consolida por subcategoria: a busca mais
// forte e o H1 e as irmas do MESMO cluster viram H2/FAQ. subcategoria null =
// cluster de uma linha so (nao mistura temas).
export async function proximoCluster(
  macro?: string,
): Promise<ClusterSelecionado | null> {
  const where = macro
    ? and(
        eq(blogKeywordQueueTable.status, "pending"),
        eq(blogKeywordQueueTable.macro, macro),
      )
    : eq(blogKeywordQueueTable.status, "pending");

  const pendentes = await db
    .select()
    .from(blogKeywordQueueTable)
    .where(where)
    .orderBy(desc(blogKeywordQueueTable.priority), desc(blogKeywordQueueTable.score));

  if (pendentes.length === 0) return null;

  const topo = pendentes[0];
  const doCluster =
    topo.subcategoria === null
      ? [topo]
      : pendentes.filter(
          (p) => p.macro === topo.macro && p.subcategoria === topo.subcategoria,
        );

  // Limita o numero de irmas para nao inflar demais o post (H1 + ~8 H2/FAQ).
  const linhas = doCluster.slice(0, 9);
  return montarCluster(linhas);
}

// Marca todas as linhas do cluster como usadas, apontando para o post gerado.
export async function marcarClusterUsado(
  rowIds: number[],
  postId: number,
): Promise<void> {
  if (rowIds.length === 0) return;
  await db
    .update(blogKeywordQueueTable)
    .set({ status: "used", usedPostId: postId, usedAt: new Date() })
    .where(inArray(blogKeywordQueueTable.id, rowIds));
}

// Marca o cluster como pulado (ex.: canibalizacao detectada antes de publicar),
// sem consumir a fila para geracao futura de um post diferente.
export async function marcarClusterPulado(
  rowIds: number[],
  motivo: string,
): Promise<void> {
  if (rowIds.length === 0) return;
  await db
    .update(blogKeywordQueueTable)
    .set({ status: "skipped", skipReason: motivo, usedAt: new Date() })
    .where(inArray(blogKeywordQueueTable.id, rowIds));
}

// Estatisticas da fila (para CLI/admin).
export async function estatisticasFila(): Promise<{
  pending: number;
  used: number;
  skipped: number;
}> {
  const rows = await db
    .select({
      status: blogKeywordQueueTable.status,
      total: sql<number>`count(*)::int`,
    })
    .from(blogKeywordQueueTable)
    .groupBy(blogKeywordQueueTable.status);
  const out = { pending: 0, used: 0, skipped: 0 };
  for (const r of rows) {
    if (r.status === "pending") out.pending = r.total;
    else if (r.status === "used") out.used = r.total;
    else if (r.status === "skipped") out.skipped = r.total;
  }
  return out;
}
