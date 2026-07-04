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
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  excerpt: text("excerpt").notNull(),
  keywords: text("keywords").array().notNull(),
  readingMinutes: integer("reading_minutes").notNull(),
  body: jsonb("body").$type<BlogPostSection[]>().notNull(),
  bodyHtml: text("body_html").notNull().default(""),
  oabClosing: text("oab_closing").notNull(),
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
