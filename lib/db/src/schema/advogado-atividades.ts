import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Log simples de ações do admin sobre um advogado (aba Verificação em /admin).
// Exibido em ordem cronológica decrescente no modal de detalhes do advogado.
export const advogadoAtividadesTable = pgTable("advogado_atividades", {
  id: serial("id").primaryKey(),
  // Referência ao advogado (advogados.id).
  advogadoId: integer("advogado_id").notNull(),
  // "perfil_ativado" | "perfil_desativado" | "marcado_verificado" |
  // "marcado_nao_verificado" | "situacao_regular" | "situacao_irregular" |
  // "situacao_invalido".
  acao: text("acao").notNull(),
  feitoPor: text("feito_por").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAdvogadoAtividadeSchema = createInsertSchema(
  advogadoAtividadesTable,
).omit({ id: true, createdAt: true });
export type InsertAdvogadoAtividade = z.infer<
  typeof insertAdvogadoAtividadeSchema
>;
export type AdvogadoAtividadeRow = typeof advogadoAtividadesTable.$inferSelect;
