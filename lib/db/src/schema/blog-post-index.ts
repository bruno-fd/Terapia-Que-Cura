import {
  pgTable,
  integer,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";
import { blogPostsTable } from "./blog-posts";

// ============================================================
// Índice do corpus de posts (ADITIVO — não altera nenhuma tabela existente).
//
// Usado para anti-canibalização (não publicar algo perto demais de um post que
// já existe) e para citação cruzada (achar posts relacionados mas não
// duplicados para linkar no meio do texto):
//   Camada 1 lexical  -> pg_trgm sobre title_normalized
//   Camada 2 semântica -> pgvector (cosseno) sobre embedding
//
// IMPORTANTE (ambiente deste projeto): o `drizzle-kit push` NÃO roda aqui (abre
// prompt interativo por drift em outra tabela e o shell não tem TTY). Por isso
// esta tabela é criada por SQL idempotente no endpoint /internal/blog/migrate
// (e no script blog-migrate). Este arquivo é a definição para o ORM/TypeScript;
// o DDL real vive no migrate e precisa bater com o que está aqui.
//
// A coluna embedding é nula quando não há provider de embeddings (a Camada 2 e
// a citação cruzada degradam, não quebram; a Camada 1 lexical segue valendo).
// ============================================================

export const blogPostIndexTable = pgTable("blog_post_index", {
  postId: integer("post_id")
    .primaryKey()
    .references(() => blogPostsTable.id, { onDelete: "cascade" }),
  titleNormalized: text("title_normalized").notNull(),
  // Título normalizado COM o "molde" removido (ex.: "tem cura? o que esperar do
  // tratamento", "o que é e como..."), deixando só a ENTIDADE/tema. É contra
  // esta coluna que a Camada 1 lexical compara, para não colidir temas distintos
  // que só compartilham o molde do título. Populada no index (stripMold).
  entityNormalized: text("entity_normalized").notNull().default(""),
  embeddedText: text("embedded_text").notNull().default(""),
  embedding: vector("embedding", { dimensions: 1024 }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BlogPostIndexRow = typeof blogPostIndexTable.$inferSelect;
