import { Router, type IRouter, type Request } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  advogadosTable,
  subscriptionsTable,
  cadastroLeadsTable,
  advogadoAtividadesTable,
  type AdvogadoRow,
  type SubscriptionRow,
  type CadastroLeadRow,
} from "@workspace/db";
import {
  ListAdminAdvogadosResponse,
  GetAdminAdvogadoParams,
  GetAdminAdvogadoResponse,
  UpdateAdminAdvogadoParams,
  UpdateAdminAdvogadoBody,
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
router.use("/admin/advogados", requireAdmin);

// Lista todos os advogados cadastrados para a aba de verificação.
router.get("/admin/advogados", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      advogado: advogadosTable,
      subStatus: subscriptionsTable.status,
      subCanceledAt: subscriptionsTable.canceledAt,
      subAccessUntil: subscriptionsTable.accessUntil,
      subEmail: subscriptionsTable.customerEmail,
    })
    .from(advogadosTable)
    .leftJoin(
      subscriptionsTable,
      eq(subscriptionsTable.lawyerRef, advogadosTable.userId),
    )
    .orderBy(desc(advogadosTable.createdAt));

  const list = rows.map((r) => ({
    id: r.advogado.id,
    nome: r.advogado.nome,
    oab: r.advogado.oab,
    email: r.subEmail ?? "",
    createdAt: r.advogado.createdAt
      ? r.advogado.createdAt.toISOString()
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
    adminAtivo: r.advogado.adminAtivo,
    oabVerificada: r.advogado.oabVerificada,
    situacaoOab: toSituacao(r.advogado.situacaoOab),
  }));

  res.json(ListAdminAdvogadosResponse.parse(list));
});

// Monta o detalhe completo de um advogado (dados + log de atividade).
async function buildDetail(row: AdvogadoRow) {
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.lawyerRef, row.userId));

  let lead: CadastroLeadRow | undefined;
  if (sub?.leadId) {
    [lead] = await db
      .select()
      .from(cadastroLeadsTable)
      .where(eq(cadastroLeadsTable.leadId, sub.leadId));
  }

  const atividades = await db
    .select()
    .from(advogadoAtividadesTable)
    .where(eq(advogadoAtividadesTable.advogadoId, row.id))
    .orderBy(desc(advogadoAtividadesTable.createdAt));

  return {
    id: row.id,
    nome: row.nome,
    oab: row.oab,
    email: sub?.customerEmail ?? lead?.email ?? "",
    cpf: lead?.cpf ?? null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    paymentStatus: derivePaymentStatus(sub ?? null),
    plano: sub?.plan ?? null,
    adminAtivo: row.adminAtivo,
    oabVerificada: row.oabVerificada,
    situacaoOab: toSituacao(row.situacaoOab),
    areas: row.areas ?? [],
    subcategorias: row.subcategorias ?? [],
    cidades: row.cidades ?? [],
    atendeOnline: row.atendeOnline,
    atividades: atividades.map((a) => ({
      id: a.id,
      acao: a.acao,
      feitoPor: a.feitoPor,
      data: a.createdAt.toISOString(),
    })),
  };
}

// E-mail do advogado (login = e-mail do pagamento). Usado nos avisos de
// situação irregular e dados inválidos.
async function recipientEmail(row: AdvogadoRow): Promise<string> {
  const [sub] = await db
    .select({
      customerEmail: subscriptionsTable.customerEmail,
      leadId: subscriptionsTable.leadId,
    })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.lawyerRef, row.userId));
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

router.get("/admin/advogados/:id", async (req, res): Promise<void> => {
  const params = GetAdminAdvogadoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(advogadosTable)
    .where(eq(advogadosTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Advogado não encontrado." });
    return;
  }
  res.json(GetAdminAdvogadoResponse.parse(await buildDetail(row)));
});

// Atualiza os controles manuais do admin: perfil ativo, verificado e situação
// da OAB. Regras de negócio (desativação automática, e-mails, log) no backend.
router.patch("/admin/advogados/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminAdvogadoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAdminAdvogadoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;

  const [row] = await db
    .select()
    .from(advogadosTable)
    .where(eq(advogadosTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Advogado não encontrado." });
    return;
  }

  const updates: Partial<typeof advogadosTable.$inferInsert> = {};
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
    body.oabVerificada !== undefined &&
    body.oabVerificada !== row.oabVerificada
  ) {
    if (body.oabVerificada) {
      if (!effectiveAtivo) {
        res
          .status(400)
          .json({ error: "Ative o perfil antes de marcar como verificado." });
        return;
      }
      updates.oabVerificada = true;
      updates.oabVerificadaEm = new Date();
      logs.push("marcado_verificado");
    } else {
      // Desmarcar verificado limpa a classificação de situação.
      updates.oabVerificada = false;
      updates.situacaoOab = null;
      logs.push("marcado_nao_verificado");
    }
  }
  const effectiveVerificada = updates.oabVerificada ?? row.oabVerificada;

  // 3. Situação da OAB. Só habilitada após verificado. "Inválido" desativa o
  // perfil automaticamente. "Irregular"/"Inválido" disparam e-mail.
  if (body.situacaoOab !== undefined && body.situacaoOab !== row.situacaoOab) {
    if (body.situacaoOab === null) {
      updates.situacaoOab = null;
    } else {
      if (!effectiveVerificada) {
        res.status(400).json({
          error: "Marque como verificado antes de definir a situação.",
        });
        return;
      }
      updates.situacaoOab = body.situacaoOab;
      if (body.situacaoOab === "regular") {
        logs.push("situacao_regular");
      } else if (body.situacaoOab === "irregular") {
        logs.push("situacao_irregular");
        emails.push(situacaoIrregularEmail(row.nome));
      } else if (body.situacaoOab === "invalido") {
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
      .update(advogadosTable)
      .set(updates)
      .where(eq(advogadosTable.id, row.id));
  }

  if (logs.length > 0) {
    await db.insert(advogadoAtividadesTable).values(
      logs.map((acao) => ({ advogadoId: row.id, acao, feitoPor: "admin" })),
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
    .from(advogadosTable)
    .where(eq(advogadosTable.id, row.id));
  res.json(GetAdminAdvogadoResponse.parse(await buildDetail(fresh ?? row)));
});

export default router;
