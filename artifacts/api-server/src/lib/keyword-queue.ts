import { sql, and, eq, desc } from "drizzle-orm";
import {
  db,
  blogKeywordQueueTable,
  blogPostsTable,
  type BlogKeywordQueueRow,
} from "@workspace/db";
import type { SugestaoComOrigem } from "./keyword-research";
import { normalizarQuery } from "./keyword-research";

// ============================================================
// Persistência da fila de palavras-chave (Fase 0).
//
// Ponte entre o minerador (keyword-research.ts, puro) e a tabela
// blog_keyword_queue. Idempotente: gravar as mesmas sugestões de novo não
// duplica linhas; só reforça o score das que já existem (graças ao índice
// único em query_normalized).
//
// NADA no fluxo diário atual chama estas funções ainda. Só a Fase 1 vai.
// ============================================================

// Grava (ou reforça) uma lista de sugestões mineradas de uma macrocategoria.
// Devolve quantas eram novas. Antes de gravar, remove as que já viraram post
// (dedup contra títulos existentes), para não enfileirar tema já coberto.
export async function enfileirarSugestoes(
  macro: string,
  sugestoes: SugestaoComOrigem[],
): Promise<{ novas: number; reforcadas: number; ignoradas: number }> {
  if (sugestoes.length === 0) return { novas: 0, reforcadas: 0, ignoradas: 0 };

  // Títulos já publicados (qualquer categoria) normalizados, para dedup simples
  // contra conteúdo existente. Evita enfileirar uma pergunta idêntica a um post
  // que já existe.
  const posts = await db
    .select({ title: blogPostsTable.title })
    .from(blogPostsTable);
  const titulosNorm = new Set(posts.map((p) => normalizarQuery(p.title)));

  let novas = 0;
  let reforcadas = 0;
  let ignoradas = 0;

  for (const s of sugestoes) {
    if (titulosNorm.has(s.queryNormalized)) {
      ignoradas += 1;
      continue;
    }

    // onConflictDoUpdate: se a query já está na fila, soma o score novo ao
    // existente (reforço de demanda) sem criar duplicata.
    const resultado = await db
      .insert(blogKeywordQueueTable)
      .values({
        query: s.query,
        queryNormalized: s.queryNormalized,
        macro,
        subcategoria: s.subcategoria,
        isQuestion: s.isQuestion,
        score: s.score,
        source: "autocomplete",
        status: "pending",
      })
      .onConflictDoUpdate({
        target: blogKeywordQueueTable.queryNormalized,
        set: {
          score: sql`${blogKeywordQueueTable.score} + ${s.score}`,
        },
      })
      .returning({
        discoveredAt: blogKeywordQueueTable.discoveredAt,
      });

    // Heurística: se discoveredAt é de agora (linha recém-criada) contamos como
    // nova; caso contrário, foi reforço. Como não temos o "inserted" direto do
    // pg via drizzle, aproximamos comparando com o instante da chamada.
    const criadaAgora =
      resultado[0] &&
      Date.now() - new Date(resultado[0].discoveredAt).getTime() < 5000;
    if (criadaAgora) novas += 1;
    else reforcadas += 1;
  }

  return { novas, reforcadas, ignoradas };
}

// Puxa as próximas perguntas pendentes de uma macrocategoria, mais fortes
// primeiro. Usado pelo gerador na Fase 1. Não altera estado (só lê).
export async function proximasPendentes(
  macro: string,
  limite = 5,
): Promise<BlogKeywordQueueRow[]> {
  return db
    .select()
    .from(blogKeywordQueueTable)
    .where(
      and(
        eq(blogKeywordQueueTable.macro, macro),
        eq(blogKeywordQueueTable.status, "pending"),
      ),
    )
    .orderBy(desc(blogKeywordQueueTable.score))
    .limit(limite);
}

// Marca uma pergunta como usada, ligando-a ao post gerado. Chamado na Fase 1
// depois que o post é publicado.
export async function marcarComoUsada(
  id: number,
  postId: number,
): Promise<void> {
  await db
    .update(blogKeywordQueueTable)
    .set({ status: "used", usedPostId: postId, usedAt: new Date() })
    .where(eq(blogKeywordQueueTable.id, id));
}
