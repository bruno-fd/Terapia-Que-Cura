import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Assinaturas dos psicólogos, vinculadas ao cliente/assinatura na Asaas.
// psicologoRef é o id do psicólogo autenticado (Clerk), único por psicólogo.
export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  // Identificador do psicólogo dono da assinatura (Clerk userId), único por
  // psicólogo. Nulo enquanto a assinatura foi criada no checkout anônimo (antes
  // do pagamento e da criação da conta). É preenchido no primeiro acesso
  // autenticado, casando pela chave customerEmail.
  psicologoRef: text("psicologo_ref").unique(),
  // Id do cliente na Asaas. Nulo enquanto o checkout não foi pago (a Asaas cria
  // o cliente apenas quando o pagador conclui o pagamento); preenchido no
  // evento CHECKOUT_PAID.
  asaasCustomerId: text("asaas_customer_id"),
  // Id da assinatura recorrente na Asaas. Com o Asaas Checkout a assinatura só
  // existe após o pagamento, então fica nulo entre a criação do checkout e o
  // evento CHECKOUT_PAID, quando é preenchido.
  asaasSubscriptionId: text("asaas_subscription_id"),
  // Id do Asaas Checkout (página de pagamento hospedada). É a chave usada para
  // reencontrar esta linha quando o pagamento é confirmado (CHECKOUT_PAID),
  // antes de existir uma assinatura. Nulo em assinaturas antigas.
  asaasCheckoutId: text("asaas_checkout_id"),
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
  // Momento em que o psicólogo cancelou a renovação automática. Nulo enquanto
  // a assinatura não foi cancelada.
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  // Data (ISO yyyy-mm-dd) até quando o perfil permanece ativo após o
  // cancelamento, referente ao período já pago. O cancelamento só interrompe
  // cobranças futuras: o perfil continua visível até esta data.
  accessUntil: text("access_until"),
  // Motivo informado pelo psicólogo na pesquisa de cancelamento (opcional).
  // Nulo enquanto a assinatura não foi cancelada ou se não informado.
  cancelReason: text("cancel_reason"),
  // leadId (funil de cadastro) associado a esta assinatura no checkout anônimo.
  // Usado para pré-preencher o perfil quando o e-mail do lead casa com o do
  // pagamento. Nulo para assinaturas antigas criadas com conta já existente.
  leadId: text("lead_id"),
  // Momento em que a conta foi provisionada (convite Clerk emitido + e-mail
  // "Conta criada" enviado) após a confirmação do pagamento. Serve de trava de
  // idempotência para não reenviar o convite/e-mail a cada evento repetido do
  // webhook. Nulo enquanto a conta ainda não foi provisionada.
  accountProvisionedAt: timestamp("account_provisioned_at", {
    withTimezone: true,
  }),
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
