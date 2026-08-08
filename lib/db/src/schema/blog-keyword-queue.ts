import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ============================================================
// Fila de buscas mineradas do Google Autocomplete.
//
// Cada linha e uma busca real que pessoas digitam, curada e pontuada por
// demanda. E a materia-prima da geracao: um post e gerado a partir de um
// CLUSTER (macro + subcategoria), consolidando varias buscas irmas num unico
// texto denso.
//
// Idempotencia: indice unico em query_normalized. Re-minerar a mesma busca so
// SOMA o score, nunca duplica.
// ============================================================

export const blogKeywordQueueTable = pgTable(
  "blog_keyword_queue",
  {
    id: serial("id").primaryKey(),
    // Texto real da busca (como foi minerado, ja normalizado para exibicao).
    query: text("query").notNull(),
    // Forma normalizada (sem acento, minuscula, espacos colapsados). Unica: a
    // chave de deduplicacao.
    queryNormalized: text("query_normalized").notNull().unique(),
    // Eixo editorial = macrocategoria do site.
    macro: text("macro").notNull(),
    // Cluster/semente = subcategoria do site. Nulo quando a busca nao veio de
    // uma semente especifica (cluster de uma linha so).
    subcategoria: text("subcategoria"),
    // Se a busca e uma pergunta ("o que e...", "como saber se...").
    isQuestion: boolean("is_question").notNull().default(false),
    // Demanda acumulada (frequencia + bonus por posicao no autocomplete).
    score: integer("score").notNull().default(0),
    // Curadoria editorial (proximidade ao que mais converte). Ordena antes do
    // score: cauda longa curada sai na frente da demanda bruta.
    priority: integer("priority").notNull().default(0),
    // Idioma da busca: "pt" | "en". Escrevemos sempre em portugues; o termo em
    // ingles entra como palavra-chave/sinonimo.
    lang: text("lang").notNull().default("pt"),
    // Origem: "autocomplete" | "curado" | "search-console".
    source: text("source").notNull().default("autocomplete"),
    // Estado: "pending" | "used" | "skipped".
    status: text("status").notNull().default("pending"),
    // Post que consumiu esta busca (quando status = used).
    usedPostId: integer("used_post_id"),
    // Motivo do skip (ex.: ja coberto por um post existente = canibalizacao).
    skipReason: text("skip_reason"),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [
    // Selecao do proximo cluster: filtra por status/macro, ordena por
    // priority/score.
    index("blog_keyword_queue_status_macro_idx").on(t.status, t.macro),
    index("blog_keyword_queue_rank_idx").on(t.priority, t.score),
  ],
);

export const insertBlogKeywordSchema = createInsertSchema(
  blogKeywordQueueTable,
).omit({ id: true, discoveredAt: true });
export type InsertBlogKeyword = z.infer<typeof insertBlogKeywordSchema>;
export type BlogKeywordRow = typeof blogKeywordQueueTable.$inferSelect;
