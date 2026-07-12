import { Router, type IRouter } from "express";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  db,
  cadastroLeadsTable,
  type CadastroLeadRow,
  type LeadCidade,
} from "@workspace/db";
import {
  UpsertCadastroLeadBody,
  UpsertCadastroLeadResponse,
  GetCadastroLeadResponse,
} from "@workspace/api-zod";
import type { Logger } from "pino";
import { sendEmail } from "../lib/email";
import { remarketingEmail } from "../lib/email-templates";

const router: IRouter = Router();

const PLANO_LABEL: Record<string, string> = {
  mensal: "Plano Mensal",
  anual: "Plano Anual",
};

function toLead(row: CadastroLeadRow) {
  return {
    leadId: row.leadId,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    cpf: row.cpf,
    crp: row.crp,
    regiao: row.regiao,
    crpVerificada: row.crpVerificada,
    crpSituacao: row.crpSituacao ?? null,
    crpNomeConfirmado: row.crpNomeConfirmado ?? null,
    crpVerificacaoPendente: row.crpVerificacaoPendente,
    plano: (row.plano as "mensal" | "anual" | null) ?? null,
    areas: row.areas ?? [],
    cidades: row.cidades ?? [],
    atendeOnline: row.atendeOnline,
    publicoAtendido: row.publicoAtendido ?? [],
    step: row.step,
    completed: row.completed,
  };
}

// Remarketing best-effort para leads que demonstraram intenção (chegaram ao
// passo de conta/pagamento com e-mail e plano escolhidos) mas ainda não
// concluíram. Enviado no máximo uma vez por lead (dedupe via remarketingSentAt,
// reivindicado com UPDATE condicional para evitar corrida).
//
// PONTO DE INTEGRAÇÃO COM AGENDADOR (disparo por inatividade): esta função é o
// mecanismo de envio, mas NÃO é chamada a partir da rota pública de upsert (isso
// permitiria abuso/spam com e-mails arbitrários). O disparo deve partir de um job
// periódico (cron), ainda não disponível neste ambiente. Quando houver um
// agendador, registre algo como:
//
//   // a cada N minutos:
//   const parados = await db.select().from(cadastroLeadsTable).where(and(
//     eq(cadastroLeadsTable.completed, false),
//     isNull(cadastroLeadsTable.remarketingSentAt),
//     lt(cadastroLeadsTable.updatedAt, sql`now() - interval '6 hours'`),
//   ));
//   for (const row of parados) await maybeSendRemarketing(row, logger);
//
// O dedupe (remarketingSentAt via UPDATE condicional) já é seguro contra corrida.
export async function maybeSendRemarketing(
  row: CadastroLeadRow,
  log: Logger,
): Promise<void> {
  if (
    row.completed ||
    row.remarketingSentAt ||
    !row.email.trim() ||
    !row.plano ||
    row.step < 4
  ) {
    return;
  }
  try {
    const [claimed] = await db
      .update(cadastroLeadsTable)
      .set({ remarketingSentAt: new Date() })
      .where(
        and(
          eq(cadastroLeadsTable.id, row.id),
          isNull(cadastroLeadsTable.remarketingSentAt),
        ),
      )
      .returning();
    if (!claimed) return;
    const tpl = remarketingEmail({
      nome: row.nome || null,
      planoLabel: row.plano ? (PLANO_LABEL[row.plano] ?? null) : null,
    });
    await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });
  } catch (err) {
    log.error({ err }, "Falha ao enviar e-mail de remarketing");
  }
}

// Upsert do lead do funil de cadastro. Público: chamado a cada passo para
// persistir o progresso e permitir retomada/remarketing. Atualiza apenas os
// campos enviados (não sobrescreve com valores padrão o que não veio no corpo).
router.post("/cadastro/lead", async (req, res): Promise<void> => {
  const parsed = UpsertCadastroLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const now = new Date();

  const insertValues = {
    leadId: data.leadId,
    nome: data.nome ?? "",
    email: data.email ?? "",
    telefone: data.telefone ?? "",
    cpf: data.cpf ?? "",
    crp: data.crp ?? "",
    regiao: data.regiao ?? "",
    crpVerificada: data.crpVerificada ?? false,
    crpSituacao: data.crpSituacao ?? null,
    crpNomeConfirmado: data.crpNomeConfirmado ?? null,
    crpVerificacaoPendente: data.crpVerificacaoPendente ?? false,
    plano: data.plano ?? null,
    areas: data.areas ?? [],
    cidades: (data.cidades ?? []) as LeadCidade[],
    atendeOnline: data.atendeOnline ?? false,
    publicoAtendido: data.publicoAtendido ?? [],
    step: data.step ?? 1,
    completed: data.completed ?? false,
    updatedAt: now,
  };

  const updateSet: Record<string, unknown> = { updatedAt: now };
  if (data.nome !== undefined) updateSet["nome"] = data.nome;
  if (data.email !== undefined) updateSet["email"] = data.email;
  if (data.telefone !== undefined) updateSet["telefone"] = data.telefone;
  if (data.cpf !== undefined) updateSet["cpf"] = data.cpf;
  if (data.crp !== undefined) updateSet["crp"] = data.crp;
  if (data.regiao !== undefined) updateSet["regiao"] = data.regiao;
  if (data.crpVerificada !== undefined)
    updateSet["crpVerificada"] = data.crpVerificada;
  if (data.crpSituacao !== undefined)
    updateSet["crpSituacao"] = data.crpSituacao;
  if (data.crpNomeConfirmado !== undefined)
    updateSet["crpNomeConfirmado"] = data.crpNomeConfirmado;
  if (data.crpVerificacaoPendente !== undefined)
    updateSet["crpVerificacaoPendente"] = data.crpVerificacaoPendente;
  if (data.plano !== undefined) updateSet["plano"] = data.plano;
  if (data.areas !== undefined) updateSet["areas"] = data.areas;
  if (data.cidades !== undefined)
    updateSet["cidades"] = data.cidades as LeadCidade[];
  if (data.atendeOnline !== undefined)
    updateSet["atendeOnline"] = data.atendeOnline;
  if (data.publicoAtendido !== undefined)
    updateSet["publicoAtendido"] = data.publicoAtendido;
  // Monotônico: nunca regredir a etapa nem reverter a conclusão. Requisições de
  // sincronização do funil chegam fora de ordem (a etapa anterior pode chegar
  // depois da conclusão), então preservamos sempre o maior progresso.
  if (data.step !== undefined)
    updateSet["step"] = sql`greatest(${cadastroLeadsTable.step}, ${data.step})`;
  if (data.completed !== undefined)
    updateSet["completed"] = sql`${cadastroLeadsTable.completed} or ${data.completed}`;

  const [row] = await db
    .insert(cadastroLeadsTable)
    .values(insertValues)
    .onConflictDoUpdate({
      target: cadastroLeadsTable.leadId,
      set: updateSet,
    })
    .returning();

  // ATENÇÃO: NÃO disparar e-mail aqui. Esta rota é pública (o lead existe antes
  // da conta), então um envio inline a cada POST permitiria abuso/spam de e-mail
  // com endereços arbitrários. O remarketing deve ser disparado por inatividade
  // a partir de um agendador (cron), que chama `maybeSendRemarketing` apenas
  // para leads parados há algumas horas. Ver o ponto de integração abaixo.

  res.json(UpsertCadastroLeadResponse.parse(toLead(row)));
});

// Recupera um lead pelo leadId (para retomar o cadastro em outro dispositivo).
router.get("/cadastro/lead/:leadId", async (req, res): Promise<void> => {
  const leadId = req.params.leadId;
  const [row] = await db
    .select()
    .from(cadastroLeadsTable)
    .where(eq(cadastroLeadsTable.leadId, leadId));
  if (!row) {
    res.status(404).json({ error: "Lead não encontrado" });
    return;
  }
  res.json(GetCadastroLeadResponse.parse(toLead(row)));
});

export default router;
