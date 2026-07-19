import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface BlogPostSection {
  heading?: string;
  paragraphs: string[];
}

export const blogPostsTable = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  // Tema específico (subcategoria) dentro da macrocategoria. Nulo = sem tema.
  subcategoria: text("subcategoria"),
  // Busca real (Google Autocomplete) que originou o post, quando gerado pelo
  // fluxo ancorado em demanda (Fase 1). Nulo em posts manuais ou do fluxo
  // antigo. Serve para deduplicar por intenção de busca e para métricas.
  targetQuery: text("target_query"),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  excerpt: text("excerpt").notNull(),
  keywords: text("keywords").array().notNull(),
  readingMinutes: integer("reading_minutes").notNull(),
  body: jsonb("body").$type<BlogPostSection[]>().notNull(),
  bodyHtml: text("body_html").notNull().default(""),
  crpClosing: text("crp_closing").notNull(),
  // Imagem de capa royalty-free (Pexels) escolhida pelo tema do post. Nula
  // quando não foi possível obter uma imagem no momento da criação.
  coverImageUrl: text("cover_image_url"),
  coverImageAlt: text("cover_image_alt"),
  coverImageCredit: text("cover_image_credit"),
  coverImageCreditUrl: text("cover_image_credit_url"),
  published: boolean("published").notNull().default(true),
  // Data da primeira publicação. Nulo enquanto o post é rascunho.
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertBlogPostSchema = createInsertSchema(blogPostsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPostRow = typeof blogPostsTable.$inferSelect;
