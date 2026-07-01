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

// Cidade de atuação informada durante o cadastro progressivo.
export interface LeadCidade {
  nome: string;
  uf: string;
}

// Captura progressiva do funil de cadastro do advogado. Cada etapa do funil
// faz um upsert por leadId (identificador anônimo gerado no navegador antes do
// login), permitindo retomar o cadastro e disparar remarketing para quem não
// concluiu. Não substitui a tabela "advogados": ao finalizar, os dados migram
// para o perfil autenticado e o lead é marcado como concluído.
export const cadastroLeadsTable = pgTable("cadastro_leads", {
  id: serial("id").primaryKey(),
  // Identificador anônimo gerado no cliente (único por lead).
  leadId: text("lead_id").notNull().unique(),
  nome: text("nome").notNull().default(""),
  email: text("email").notNull().default(""),
  telefone: text("telefone").notNull().default(""),
  // Dados de identificação informados na Etapa 1 (não-oficiais até o pagamento).
  cpf: text("cpf").notNull().default(""),
  oab: text("oab").notNull().default(""),
  seccional: text("seccional").notNull().default(""),
  // Resultado da verificação real da OAB feita na Etapa 1. Persistido no lead
  // porque o pagamento e a criação da conta acontecem bem depois, então o
  // resultado precisa sobreviver ao token de curta duração para ser transferido
  // ao perfil quando a conta nascer.
  oabVerificada: boolean("oab_verificada").notNull().default(false),
  oabSituacao: text("oab_situacao"),
  oabNomeConfirmado: text("oab_nome_confirmado"),
  // true quando a verificação não pôde ser concluída (serviço indisponível) e
  // o perfil precisará de revisão manual.
  oabVerificacaoPendente: boolean("oab_verificacao_pendente")
    .notNull()
    .default(false),
  // Plano escolhido: "mensal" | "anual" | null (ainda não escolhido).
  plano: text("plano"),
  // Áreas de atuação (nomes de categorias do site).
  areas: jsonb("areas").$type<string[]>().notNull().default([]),
  cidades: jsonb("cidades").$type<LeadCidade[]>().notNull().default([]),
  atendeOnline: boolean("atende_online").notNull().default(false),
  // Última etapa alcançada no funil (1 a 5).
  step: integer("step").notNull().default(1),
  completed: boolean("completed").notNull().default(false),
  // Momento em que o e-mail de remarketing foi enviado (null = não enviado).
  remarketingSentAt: timestamp("remarketing_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCadastroLeadSchema = createInsertSchema(
  cadastroLeadsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCadastroLead = z.infer<typeof insertCadastroLeadSchema>;
export type CadastroLeadRow = typeof cadastroLeadsTable.$inferSelect;
