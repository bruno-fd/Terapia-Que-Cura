import {
  pgTable,
  serial,
  text,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Cidade de atuação do advogado.
export interface Cidade {
  nome: string;
  uf: string;
}

// Perfil público do advogado, vinculado à conta autenticada (Clerk userId).
// Um perfil só aparece no diretório público quando a assinatura está "ativa"
// E o perfil está completo (regra derivada em tempo de consulta, não armazenada).
export const advogadosTable = pgTable("advogados", {
  id: serial("id").primaryKey(),
  // Id da conta autenticada dona do perfil (único por advogado).
  userId: text("user_id").notNull().unique(),
  nome: text("nome").notNull().default(""),
  oab: text("oab").notNull().default(""),
  // URL da foto (data URL ou link). Nulo quando sem foto.
  photo: text("photo"),
  about: text("about").notNull().default(""),
  // Áreas de atuação (nomes de categorias do site).
  areas: jsonb("areas").$type<string[]>().notNull().default([]),
  cidades: jsonb("cidades").$type<Cidade[]>().notNull().default([]),
  atendeOnline: boolean("atende_online").notNull().default(false),
  whatsapp: text("whatsapp").notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  website: text("website").notNull().default(""),
  outro: text("outro").notNull().default(""),
  // Verificação da inscrição na OAB (via webservice CNA da OAB Federal).
  // Preenchidos a partir do resultado da verificação feita no funil de cadastro.
  oabVerificada: boolean("oab_verificada").notNull().default(false),
  oabSituacao: text("oab_situacao"),
  oabNomeConfirmado: text("oab_nome_confirmado"),
  oabVerificadaEm: timestamp("oab_verificada_em", { withTimezone: true }),
  // true quando a verificação não pôde ser concluída (serviço indisponível) e
  // o lead precisa de revisão manual antes da ativação do perfil.
  oabVerificacaoPendente: boolean("oab_verificacao_pendente")
    .notNull()
    .default(false),
  // Controle manual do admin (aba Verificação em /admin). Independente do status
  // de pagamento: quando false, o perfil sai do diretório público mesmo pagante.
  // Padrão true para que advogados pagantes já cadastrados sigam visíveis.
  adminAtivo: boolean("admin_ativo").notNull().default(true),
  // Classificação manual da OAB feita pelo admin após marcar como verificado:
  // "regular" | "irregular" | "invalido". Nula enquanto não classificado.
  situacaoOab: text("situacao_oab"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAdvogadoSchema = createInsertSchema(advogadosTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdvogado = z.infer<typeof insertAdvogadoSchema>;
export type AdvogadoRow = typeof advogadosTable.$inferSelect;
