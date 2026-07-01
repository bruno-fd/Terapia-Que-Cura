import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Assinaturas dos advogados, vinculadas ao cliente/assinatura na Asaas.
// lawyerRef é o id do advogado autenticado (Clerk), único por advogado.
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
  // Momento em que o advogado cancelou a renovação automática. Nulo enquanto
  // a assinatura não foi cancelada.
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  // Data (ISO yyyy-mm-dd) até quando o perfil permanece ativo após o
  // cancelamento, referente ao período já pago. O cancelamento só interrompe
  // cobranças futuras: o perfil continua visível até esta data.
  accessUntil: text("access_until"),
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
