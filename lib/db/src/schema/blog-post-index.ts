import {
  pgTable,
  integer,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";
import { blogPostsTable } from "./blog-posts";

// ============================================================
// Indice do corpus de posts, usado para:
//   1. Anti-canibalizacao (nao publicar algo perto demais de um post que ja
//      ranqueia): Camada 1 lexical (pg_trgm sobre title_normalized) + Camada 2
//      semantica (pgvector, cosseno sobre embedding).
//   2. Citacao cruzada (achar posts relacionados mas nao duplicados para linkar
//      no meio do texto): faixa semantica intermediaria.
//
// Reconstruivel a qualquer momento a partir da tabela de posts. Idempotente:
// upsert por post_id.
//
// IMPORTANTE: o `db:push` cria a coluna vector (a extensao `vector` precisa
// existir ANTES), mas NAO cria os indices especiais. Rode o script blog-migrate
// para criar as extensoes e os indices GIN(trgm) + HNSW (ver
// artifacts/api-server/src/blog-migrate.ts).
// ============================================================

export const blogPostIndexTable = pgTable("blog_post_index", {
  postId: integer("post_id")
    .primaryKey()
    .references(() => blogPostsTable.id, { onDelete: "cascade" }),
  // Titulo normalizado (sem acento, minuscula) para o match lexical pg_trgm.
  titleNormalized: text("title_normalized").notNull(),
  // Texto que gerou o embedding (titulo + resumo). Guardado para auditoria e
  // reconstrucao.
  embeddedText: text("embedded_text").notNull().default(""),
  // Embedding de (titulo + resumo). Nulo quando nao ha provider de embeddings
  // configurado (a Camada 2 e a citacao cruzada degradam, nao quebram).
  embedding: vector("embedding", { dimensions: 1024 }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BlogPostIndexRow = typeof blogPostIndexTable.$inferSelect;
