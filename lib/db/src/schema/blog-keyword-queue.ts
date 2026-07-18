import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ============================================================
// Fila de palavras-chave/perguntas mineradas (Fase 0 da estratégia de blog).
//
// Cada linha é UMA pergunta ou termo real que o Google sugere (via API pública
// de Autocomplete), guardado para virar tema de post. É a ponte entre "demanda
// real de busca" e o gerador diário: em vez de a IA inventar o título, ela
// escreve sobre uma pergunta que as pessoas de fato digitam.
//
// Esta tabela é ADITIVA e isolada: nada no fluxo atual lê ou escreve nela até
// a Fase 1 conectar o gerador. Enquanto isso, o minerador só a preenche.
//
// Idempotência: `queryNormalized` é único. Rodar o minerador várias vezes não
// duplica perguntas; só acrescenta as novas e reforça o score das repetidas.
//
// status:
//   "pending" = ainda não virou post; disponível para o gerador puxar.
//   "used"    = já gerou um post (ver usedPostId/usedAt).
//   "skipped" = descartada manualmente ou por filtro (não vira post).
// ============================================================
export const blogKeywordQueueTable = pgTable("blog_keyword_queue", {
  id: serial("id").primaryKey(),
  // A sugestão real do Google, como veio (ex.: "ansiedade social tem cura").
  // É o tema/pergunta que o post vai responder.
  query: text("query").notNull(),
  // Versão normalizada (sem acento, minúscula, espaços colapsados) usada para
  // deduplicar. Único: garante que a mesma pergunta não entre duas vezes.
  queryNormalized: text("query_normalized").notNull().unique(),
  // Macrocategoria à qual a pergunta pertence (uma das 14 do site).
  macro: text("macro").notNull(),
  // Subcategoria/semente que originou a busca (nulo quando veio da macro solta).
  subcategoria: text("subcategoria"),
  // true quando a sugestão é uma pergunta ("o que é...", "como...", "... tem
  // cura?"). Perguntas viram ótimos H2 e alimentam o rich result de FAQ.
  isQuestion: boolean("is_question").notNull().default(false),
  // Prioridade: cresce com a frequência com que a sugestão apareceu e com quão
  // no topo ela veio no Autocomplete. Quanto maior, mais forte a demanda.
  score: integer("score").notNull().default(0),
  // Origem do dado. Hoje só "autocomplete"; deixa espaço para "search-console"
  // (Fase 4) sem migração nova.
  source: text("source").notNull().default("autocomplete"),
  // Ciclo de vida da pergunta na fila.
  status: text("status").notNull().default("pending"),
  // Post gerado a partir desta pergunta, quando status = "used".
  usedPostId: integer("used_post_id"),
  discoveredAt: timestamp("discovered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const insertBlogKeywordQueueSchema = createInsertSchema(
  blogKeywordQueueTable,
).omit({ id: true, discoveredAt: true });
export type InsertBlogKeywordQueue = z.infer<
  typeof insertBlogKeywordQueueSchema
>;
export type BlogKeywordQueueRow = typeof blogKeywordQueueTable.$inferSelect;
