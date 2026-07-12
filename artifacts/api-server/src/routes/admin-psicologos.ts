import { Router, type IRouter, type Request } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  psicologosTable,
  subscriptionsTable,
  cadastroLeadsTable,
  psicologoAtividadesTable,
  type PsicologoRow,
  type SubscriptionRow,
  type CadastroLeadRow,
} from "@workspace/db";
import {
  ListAdminPsicologosResponse,
  GetAdminPsicologoParams,
  GetAdminPsicologoResponse,
  UpdateAdminPsicologoParams,
  UpdateAdminPsicologoBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";
import { sendEmail } from "../lib/email";
import {
  situacaoIrregularEmail,
  dadosInvalidosEmail,
  type EmailContent,
} from "../lib/email-templates";

const router: IRouter = Router();

type SubStatus = "pendente" | "ativa" | "atrasada" | "inativa";

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Status de pagamento efetivo, respeitando a carência de cancelamento (uma
// assinatura cancelada cujo período pago já venceu conta como inativa).
function derivePaymentStatus(
  sub: Pick<
    SubscriptionRow,
    "status" | "canceledAt" | "accessUntil"
  > | null,
): SubStatus | null {
  if (!sub) return null;
  if (
    sub.status === "ativa" &&
    sub.canceledAt &&
    (!sub.accessUntil || sub.accessUntil <= hojeIso())
  ) {
    return "inativa";
  }
  return (sub.status as SubStatus | undefined) ?? null;
}

function toSituacao(
  value: string | null,
): "regular" | "irregular" | "invalido" | null {
  if (value === "regular" || value === "irregular" || value === "invalido") {
    return value;
  }
  return null;
}

// Todas as rotas de verificação exigem a guarda simples do admin.
router.use("/admin/psicologos", requireAdmin);

// Lista todos os psicólogos cadastrados para a aba de verificação.
router.get("/admin/psicologos", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      psicologo: psicologosTable,
      subStatus: subscriptionsTable.status,
      subCanceledAt: subscriptionsTable.canceledAt,
      subAccessUntil: subscriptionsTable.accessUntil,
      subEmail: subscriptionsTable.customerEmail,
    })
    .from(psicologosTable)
    .leftJoin(
      subscriptionsTable,
      eq(subscriptionsTable.psicologoRef, psicologosTable.userId),
    )
    .orderBy(desc(psicologosTable.createdAt));

  const list = rows.map((r) => ({
    id: r.psicologo.id,
    nome: r.psicologo.nome,
    crp: r.psicologo.crp,
    email: r.subEmail ?? "",
    createdAt: r.psicologo.createdAt
      ? r.psicologo.createdAt.toISOString()
      : null,
    paymentStatus: derivePaymentStatus(
      r.subStatus
        ? {
            status: r.subStatus,
            canceledAt: r.subCanceledAt,
            accessUntil: r.subAccessUntil,
          }
        : null,
    ),
    adminAtivo: r.psicologo.adminAtivo,
    crpVerificada: r.psicologo.crpVerificada,
    situacaoCrp: toSituacao(r.psicologo.situacaoCrp),
  }));

  res.json(ListAdminPsicologosResponse.parse(list));
});

// Monta o detalhe completo de um psicólogo (dados + log de atividade).
async function buildDetail(row: PsicologoRow) {
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.psicologoRef, row.userId));

  let lead: CadastroLeadRow | undefined;
  if (sub?.leadId) {
    [lead] = await db
      .select()
      .from(cadastroLeadsTable)
      .where(eq(cadastroLeadsTable.leadId, sub.leadId));
  }

  const atividades = await db
    .select()
    .from(psicologoAtividadesTable)
    .where(eq(psicologoAtividadesTable.psicologoId, row.id))
    .orderBy(desc(psicologoAtividadesTable.createdAt));

  return {
    id: row.id,
    nome: row.nome,
    crp: row.crp,
    email: sub?.customerEmail ?? lead?.email ?? "",
    cpf: lead?.cpf ?? null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    paymentStatus: derivePaymentStatus(sub ?? null),
    plano: sub?.plan ?? null,
    adminAtivo: row.adminAtivo,
    crpVerificada: row.crpVerificada,
    situacaoCrp: toSituacao(row.situacaoCrp),
    areas: row.areas ?? [],
    subcategorias: row.subcategorias ?? [],
    cidades: row.cidades ?? [],
    atendeOnline: row.atendeOnline,
    publicoAtendido: row.publicoAtendido ?? [],
    precoSessao: row.precoSessao,
    atividades: atividades.map((a) => ({
      id: a.id,
      acao: a.acao,
      feitoPor: a.feitoPor,
      data: a.createdAt.toISOString(),
    })),
  };
}

// E-mail do psicólogo (login = e-mail do pagamento). Usado nos avisos de
// situação irregular e dados inválidos.
async function recipientEmail(row: PsicologoRow): Promise<string> {
  const [sub] = await db
    .select({
      customerEmail: subscriptionsTable.customerEmail,
      leadId: subscriptionsTable.leadId,
    })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.psicologoRef, row.userId));
  if (sub?.customerEmail) return sub.customerEmail;
  if (sub?.leadId) {
    const [lead] = await db
      .select({ email: cadastroLeadsTable.email })
      .from(cadastroLeadsTable)
      .where(eq(cadastroLeadsTable.leadId, sub.leadId));
    if (lead?.email) return lead.email;
  }
  return "";
}

router.get("/admin/psicologos/:id", async (req, res): Promise<void> => {
  const params = GetAdminPsicologoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(psicologosTable)
    .where(eq(psicologosTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Psicólogo não encontrado." });
    return;
  }
  res.json(GetAdminPsicologoResponse.parse(await buildDetail(row)));
});

// Atualiza os controles manuais do admin: perfil ativo, verificado e situação
// do CRP. Regras de negócio (desativação automática, e-mails, log) no backend.
router.patch("/admin/psicologos/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminPsicologoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAdminPsicologoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;

  const [row] = await db
    .select()
    .from(psicologosTable)
    .where(eq(psicologosTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Psicólogo não encontrado." });
    return;
  }

  const updates: Partial<typeof psicologosTable.$inferInsert> = {};
  const logs: string[] = [];
  const emails: EmailContent[] = [];

  // 1. Toggle de perfil ativo (explícito).
  if (body.adminAtivo !== undefined && body.adminAtivo !== row.adminAtivo) {
    updates.adminAtivo = body.adminAtivo;
    logs.push(body.adminAtivo ? "perfil_ativado" : "perfil_desativado");
  }
  const effectiveAtivo = updates.adminAtivo ?? row.adminAtivo;

  // 2. Toggle de verificado. Só pode marcar como verificado com perfil ativo.
  if (
    body.crpVerificada !== undefined &&
    body.crpVerificada !== row.crpVerificada
  ) {
    if (body.crpVerificada) {
      if (!effectiveAtivo) {
        res
          .status(400)
          .json({ error: "Ative o perfil antes de marcar como verificado." });
        return;
      }
      updates.crpVerificada = true;
      updates.crpVerificadaEm = new Date();
      logs.push("marcado_verificado");
    } else {
      // Desmarcar verificado limpa a classificação de situação.
      updates.crpVerificada = false;
      updates.situacaoCrp = null;
      logs.push("marcado_nao_verificado");
    }
  }
  const effectiveVerificada = updates.crpVerificada ?? row.crpVerificada;

  // 3. Situação do CRP. Só habilitada após verificado. "Inválido" desativa o
  // perfil automaticamente. "Irregular"/"Inválido" disparam e-mail.
  if (body.situacaoCrp !== undefined && body.situacaoCrp !== row.situacaoCrp) {
    if (body.situacaoCrp === null) {
      updates.situacaoCrp = null;
    } else {
      if (!effectiveVerificada) {
        res.status(400).json({
          error: "Marque como verificado antes de definir a situação.",
        });
        return;
      }
      updates.situacaoCrp = body.situacaoCrp;
      if (body.situacaoCrp === "regular") {
        logs.push("situacao_regular");
      } else if (body.situacaoCrp === "irregular") {
        logs.push("situacao_irregular");
        emails.push(situacaoIrregularEmail(row.nome));
      } else if (body.situacaoCrp === "invalido") {
        // Desativa o perfil automaticamente (regra de negócio no backend).
        updates.adminAtivo = false;
        logs.push("situacao_invalido");
        emails.push(dadosInvalidosEmail(row.nome));
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await db
      .update(psicologosTable)
      .set(updates)
      .where(eq(psicologosTable.id, row.id));
  }

  if (logs.length > 0) {
    await db.insert(psicologoAtividadesTable).values(
      logs.map((acao) => ({ psicologoId: row.id, acao, feitoPor: "admin" })),
    );
  }

  // E-mails best-effort (nunca lançam). Enviados após gravar o novo status.
  if (emails.length > 0) {
    const to = await recipientEmail(row);
    for (const content of emails) {
      await sendEmail({ to, subject: content.subject, html: content.html });
    }
  }

  const [fresh] = await db
    .select()
    .from(psicologosTable)
    .where(eq(psicologosTable.id, row.id));
  res.json(GetAdminPsicologoResponse.parse(await buildDetail(fresh ?? row)));
});

export default router;
