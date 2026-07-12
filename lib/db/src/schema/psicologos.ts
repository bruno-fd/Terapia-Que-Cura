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

// Cidade de atuação do psicólogo.
export interface Cidade {
  nome: string;
  uf: string;
}

// Perfil público do psicólogo, vinculado à conta autenticada (Clerk userId).
// Um perfil só aparece no diretório público quando a assinatura está "ativa"
// E o perfil está completo (regra derivada em tempo de consulta, não armazenada).
export const psicologosTable = pgTable("psicologos", {
  id: serial("id").primaryKey(),
  // Id da conta autenticada dona do perfil (único por psicólogo).
  userId: text("user_id").notNull().unique(),
  nome: text("nome").notNull().default(""),
  crp: text("crp").notNull().default(""),
  // URL da foto (data URL ou link). Nulo quando sem foto.
  photo: text("photo"),
  about: text("about").notNull().default(""),
  // Áreas de atuação (nomes de macrocategorias do site).
  areas: jsonb("areas").$type<string[]>().notNull().default([]),
  // Temas específicos (subcategorias) opcionais dentro das áreas marcadas.
  subcategorias: jsonb("subcategorias").$type<string[]>().notNull().default([]),
  cidades: jsonb("cidades").$type<Cidade[]>().notNull().default([]),
  atendeOnline: boolean("atende_online").notNull().default(false),
  // Público atendido (ex.: Adultos, Crianças, Casais, LGBTQIA+). Filtrável na busca.
  publicoAtendido: jsonb("publico_atendido")
    .$type<string[]>()
    .notNull()
    .default([]),
  // Faixa de valor da sessão, em texto livre (ex.: "R$150 - R$250"). Opcional.
  precoSessao: text("preco_sessao").notNull().default(""),
  whatsapp: text("whatsapp").notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  website: text("website").notNull().default(""),
  outro: text("outro").notNull().default(""),
  // Verificação da inscrição no CRP (via webservice de consulta ao CRP).
  // Preenchidos a partir do resultado da verificação feita no funil de cadastro.
  crpVerificada: boolean("crp_verificada").notNull().default(false),
  crpSituacao: text("crp_situacao"),
  crpNomeConfirmado: text("crp_nome_confirmado"),
  crpVerificadaEm: timestamp("crp_verificada_em", { withTimezone: true }),
  // true quando a verificação não pôde ser concluída (serviço indisponível) e
  // o lead precisa de revisão manual antes da ativação do perfil.
  crpVerificacaoPendente: boolean("crp_verificacao_pendente")
    .notNull()
    .default(false),
  // Controle manual do admin (aba Verificação em /admin). Independente do status
  // de pagamento: quando false, o perfil sai do diretório público mesmo pagante.
  // Padrão true para que psicólogos pagantes já cadastrados sigam visíveis.
  adminAtivo: boolean("admin_ativo").notNull().default(true),
  // Classificação manual do CRP feita pelo admin após marcar como verificado:
  // "regular" | "irregular" | "invalido". Nula enquanto não classificado.
  situacaoCrp: text("situacao_crp"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPsicologoSchema = createInsertSchema(psicologosTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPsicologo = z.infer<typeof insertPsicologoSchema>;
export type PsicologoRow = typeof psicologosTable.$inferSelect;
