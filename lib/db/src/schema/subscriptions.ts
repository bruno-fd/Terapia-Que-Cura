import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Assinaturas dos advogados, vinculadas ao cliente/assinatura na Asaas.
// Nesta etapa (modo demonstração) usamos um advogado fixo (lawyerRef), sem
// login real. Quando houver cadastro real, lawyerRef passa a ser o id do
// advogado autenticado.
export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  // Identificador do advogado dono da assinatura (único por advogado).
  lawyerRef: text("lawyer_ref").notNull().unique(),
  asaasCustomerId: text("asaas_customer_id").notNull(),
  asaasSubscriptionId: text("asaas_subscription_id").notNull(),
  // "mensal" | "anual"
  plan: text("plan").notNull(),
  // "pendente" | "ativa" | "atrasada" | "inativa"
  status: text("status").notNull().default("pendente"),
  // Valor em centavos para evitar imprecisão de ponto flutuante.
  valueCents: integer("value_cents").notNull(),
  // Ciclo de cobrança na Asaas: "MONTHLY" | "YEARLY"
  cycle: text("cycle").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  // Data da próxima cobrança (ISO yyyy-mm-dd), conforme a Asaas.
  nextDueDate: text("next_due_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(
  subscriptionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type SubscriptionRow = typeof subscriptionsTable.$inferSelect;
