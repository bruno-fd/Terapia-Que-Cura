import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Registro de cada tentativa do gerador diário automático de posts, uma linha
// por macrocategoria por execução. Alimenta a métrica de aceitação no /admin.
// status:
//   "published" = post gerado, verificado e publicado.
//   "rejected"  = reprovado pela verificação de veracidade (descartado).
//   "skipped"   = já havia post criado hoje na categoria (idempotência).
//   "failed"    = erro (geração/verificação/persistência).
export const blogDailyRunsTable = pgTable("blog_daily_runs", {
  id: serial("id").primaryKey(),
  // Data da execução no formato YYYY-MM-DD (fuso do servidor).
  runDate: text("run_date").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  // Motivo da reprovação/falha (nulo quando publicado ou pulado).
  reason: text("reason"),
  // Título gerado/tentado (nulo em falhas antes da geração).
  title: text("title"),
  // Referência ao post criado, quando publicado.
  postId: integer("post_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertBlogDailyRunSchema = createInsertSchema(
  blogDailyRunsTable,
).omit({ id: true, createdAt: true });
export type InsertBlogDailyRun = z.infer<typeof insertBlogDailyRunSchema>;
export type BlogDailyRunRow = typeof blogDailyRunsTable.$inferSelect;
