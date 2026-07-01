import { Router, type IRouter, type Request } from "express";
import { eq, and, ne, isNull } from "drizzle-orm";
import type { Logger } from "pino";
import {
  db,
  subscriptionsTable,
  advogadosTable,
  cadastroLeadsTable,
  type SubscriptionRow,
} from "@workspace/db";
import {
  GetAssinaturaResponse,
  CreateAssinaturaBody,
  CreateAssinaturaResponse,
  CancelAssinaturaBody,
  CancelAssinaturaResponse,
  SolicitarReembolsoBody,
  SolicitarReembolsoResponse,
  IniciarCheckoutBody,
  IniciarCheckoutResponse,
} from "@workspace/api-zod";
import {
  createCustomer,
  createSubscription,
  listSubscriptionPayments,
  deleteSubscription,
  refundPayment,
  AsaasError,
  type AsaasPayment,
} from "../lib/asaas";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth, clerkClient } from "@clerk/express";
import { claimSubscriptionForUser } from "../lib/subscriptionClaim";
import { sendEmail } from "../lib/email";
import {
  subscriptionCreatedEmail,
  accountCreatedEmail,
  paymentConfirmedEmail,
  paymentOverdueEmail,
} from "../lib/email-templates";

const router: IRouter = Router();

type Plano = "mensal" | "anual";
type SubStatus = "pendente" | "ativa" | "atrasada" | "inativa";

interface PlanConfig {
  valueCents: number;
  cycle: "MONTHLY" | "YEARLY";
  description: string;
}

const PLANS: Record<Plano, PlanConfig> = {
  mensal: {
    valueCents: 4990,
    cycle: "MONTHLY",
    description: "Plano Mensal, Minha Causa Justa",
  },
  anual: {
    valueCents: 47880,
    cycle: "YEARLY",
    description: "Plano Anual, Minha Causa Justa",
  },
};

const PAID_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const PENDING_STATUSES = new Set([
  "PENDING",
  "AWAITING_RISK_ANALYSIS",
  "AWAITING_CHARGEBACK_REVERSAL",
]);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function planoLabel(plano: Plano): string {
  return plano === "mensal" ? "Plano Mensal" : "Plano Anual";
}

function paymentDisplayStatus(
  status: string,
): "Pago" | "Pendente" | "Falhou" {
  if (PAID_STATUSES.has(status)) return "Pago";
  if (PENDING_STATUSES.has(status)) return "Pendente";
  return "Falhou";
}

// Soma um ciclo (mês ou ano) a uma data ISO yyyy-mm-dd.
function addCycle(dateIso: string, cycle: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  if (cycle === "YEARLY") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// Data até quando o período já pago é válido: pega o pagamento pago mais
// recente e soma um ciclo. Ex.: pagamento mensal com vencimento 01/03 cobre
// o acesso até 01/04 (o perfil fica ativo durante todo o mês de março).
function computeAccessUntil(
  payments: AsaasPayment[],
  cycle: string,
): string | null {
  const paidDates = payments
    .filter((p) => PAID_STATUSES.has(p.status))
    .map((p) => p.dueDate ?? p.paymentDate)
    .filter((d): d is string => !!d)
    .sort();
  const last = paidDates[paidDates.length - 1];
  return last ? addCycle(last, cycle) : null;
}

// Estado geral da assinatura, derivado dos pagamentos da Asaas. O webhook
// também atualiza o status; aqui derivamos ao vivo para o painel funcionar
// mesmo antes de qualquer webhook chegar.
function deriveStatus(
  row: SubscriptionRow,
  payments: AsaasPayment[],
): SubStatus {
  // Assinatura cancelada: regra AUTORITATIVA e baseada em data, avaliada antes
  // de qualquer status persistido. O cancelamento só interrompe cobranças
  // futuras. O perfil permanece ativo até o fim do período já pago
  // (accessUntil); depois dessa data, torna-se inativa. Não depende de novos
  // pagamentos nem deixa que um status persistido desatualizado sobreponha as
  // datas de carência.
  if (row.canceledAt) {
    return row.accessUntil && todayIso() < row.accessUntil
      ? "ativa"
      : "inativa";
  }
  if (row.status === "inativa") return "inativa";
  const hasOverdue = payments.some((p) => p.status === "OVERDUE");
  if (hasOverdue) return "atrasada";
  const hasPaid = payments.some((p) => PAID_STATUSES.has(p.status));
  if (hasPaid) return "ativa";
  return "pendente";
}

// Data (yyyy-mm-dd) do primeiro pagamento pago, usada como início do prazo
// legal de arrependimento (7 dias). Preferimos a data efetiva de pagamento;
// na falta dela, o vencimento.
function firstPaidDate(payments: AsaasPayment[]): string | null {
  const paidDates = payments
    .filter((p) => PAID_STATUSES.has(p.status))
    .map((p) => p.paymentDate ?? p.dueDate)
    .filter((d): d is string => !!d)
    .sort();
  return paidDates[0] ?? null;
}

// Direito de arrependimento (CDC art. 49): reembolso disponível somente
// enquanto houver um pagamento pago E hoje estiver dentro do prazo de 7 dias.
// Contagem conforme art. 132 do Código Civil: exclui-se o dia do pagamento e
// contam-se os 7 dias seguintes (inclusive o 7º), logo o limite é
// primeiroPagamento + 7 dias, inclusive. Fora desse prazo, não há elegibilidade.
function isRefundEligible(payments: AsaasPayment[]): boolean {
  const first = firstPaidDate(payments);
  if (!first) return false;
  const deadline = new Date(`${first}T00:00:00Z`);
  deadline.setUTCDate(deadline.getUTCDate() + 7);
  return todayIso() <= deadline.toISOString().slice(0, 10);
}

// Link da fatura hospedada de cartão de crédito para o botão "Pagar agora".
function openInvoiceUrl(payments: AsaasPayment[]): string | null {
  const open = payments.find(
    (p) =>
      (PENDING_STATUSES.has(p.status) || p.status === "OVERDUE") &&
      p.invoiceUrl,
  );
  return open?.invoiceUrl ?? null;
}

function buildState(
  row: SubscriptionRow,
  payments: AsaasPayment[],
  status: SubStatus,
) {
  const visible = payments
    .filter((p) => p.status !== "DELETED")
    .map((p) => ({
      id: p.id,
      date: p.paymentDate ?? p.dueDate ?? null,
      description: p.description ?? row.plan,
      value: p.value,
      status: paymentDisplayStatus(p.status),
      invoiceUrl: p.invoiceUrl ?? null,
    }));
  return {
    hasSubscription: true,
    status,
    plan: row.plan as Plano,
    value: row.valueCents / 100,
    cycle: row.cycle,
    customerName: row.customerName,
    nextDueDate: row.nextDueDate,
    canceledAt: row.canceledAt ? row.canceledAt.toISOString() : null,
    accessUntil: row.accessUntil ?? null,
    refundEligible: isRefundEligible(payments),
    invoiceUrl: openInvoiceUrl(payments),
    payments: visible,
  };
}

const EMPTY_STATE = {
  hasSubscription: false,
  status: null,
  plan: null,
  value: null,
  cycle: null,
  customerName: null,
  nextDueDate: null,
  canceledAt: null,
  accessUntil: null,
  refundEligible: false,
  invoiceUrl: null,
  payments: [],
};

async function findRow(
  lawyerRef: string,
): Promise<SubscriptionRow | undefined> {
  const [row] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.lawyerRef, lawyerRef));
  return row;
}

// E-mail da conta autenticada (Clerk). Fonte da verdade para o vínculo com a
// assinatura criada no checkout anônimo, cujo lawyerRef nasce nulo.
async function getAuthedEmail(req: Request): Promise<string | null> {
  try {
    const clerkUserId = getAuth(req).userId;
    if (!clerkUserId) return null;
    const user = await clerkClient.users.getUser(clerkUserId);
    return (
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null
    );
  } catch (err) {
    req.log.error({ err }, "Falha ao obter e-mail da conta no Clerk");
    return null;
  }
}

// Resolve a assinatura do advogado autenticado. No modelo "checkout primeiro" a
// assinatura é criada de forma anônima (lawyerRef nulo, chaveada por
// customerEmail). No primeiro acesso autenticado, casamos pelo e-mail da conta
// (que é o mesmo do pagamento, pois o convite trava o e-mail) e vinculamos o
// lawyerRef de forma atômica, para os acessos seguintes irem direto pelo id.
async function resolveRowForUser(
  req: Request,
): Promise<SubscriptionRow | undefined> {
  return claimSubscriptionForUser(req.userId!, await getAuthedEmail(req));
}

// Base pública da aplicação, usada para construir o link de convite (criação de
// senha) do e-mail "Conta criada". Preferimos APP_PUBLIC_URL; na ausência,
// usamos o primeiro domínio público do Replit.
function appPublicUrl(): string {
  const explicit = process.env["APP_PUBLIC_URL"];
  if (explicit) return explicit.replace(/\/$/, "");
  const domain = (process.env["REPLIT_DOMAINS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return domain ? `https://${domain}` : "https://minhacausajusta.com.br";
}

// Emite um convite do Clerk (sem enviar e-mail do Clerk: notify=false) para o
// e-mail do pagamento. O advogado clica, define a senha na nossa página
// /sign-up (o ticket vem embutido na URL) e a conta nasce travada nesse e-mail.
// Idempotente (ignoreExisting) para poder ser reexecutado por eventos repetidos.
async function createAccountInvitation(
  email: string,
  log: Logger,
): Promise<string> {
  const base = appPublicUrl();
  try {
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${base}/sign-up`,
      notify: false,
      ignoreExisting: true,
    });
    return invitation.url ?? `${base}/sign-up`;
  } catch (err) {
    log.error({ err }, "Falha ao criar convite Clerk");
    throw err;
  }
}

// Estado atual da assinatura do advogado.
router.get("/assinatura", requireAuth, async (req, res): Promise<void> => {
  const row = await resolveRowForUser(req);
  if (!row) {
    res.json(GetAssinaturaResponse.parse(EMPTY_STATE));
    return;
  }

  let payments: AsaasPayment[] = [];
  let fetched = false;
  try {
    payments = await listSubscriptionPayments(row.asaasSubscriptionId);
    fetched = true;
  } catch (err) {
    req.log.error({ err }, "Falha ao listar pagamentos da Asaas");
  }

  // Assinatura cancelada é derivada por data (accessUntil), sem depender da
  // Asaas, então podemos recalcular mesmo se a listagem de pagamentos falhar.
  // Caso contrário, só recalculamos/persistimos quando os pagamentos foram
  // obtidos com sucesso: numa falha temporária da Asaas, mantemos o status
  // persistido para não rebaixar uma assinatura ativa por engano.
  const canDerive = fetched || !!row.canceledAt;
  const status = canDerive
    ? deriveStatus(row, payments)
    : (row.status as SubStatus);
  if (canDerive && status !== row.status) {
    await db
      .update(subscriptionsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, row.id));
    row.status = status;
  }

  res.json(GetAssinaturaResponse.parse(buildState(row, payments, status)));
});

// Cria uma assinatura na Asaas e persiste o vínculo.
router.post("/assinatura", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAssinaturaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { plano, nome, cpfCnpj, telefone } = parsed.data;
  const plan = PLANS[plano as Plano];

  // A cobrança usa SEMPRE o e-mail da conta autenticada (Clerk), nunca o
  // e-mail digitado no funil (que pode divergir, ex.: login Google com outro
  // e-mail). Se o e-mail da conta não puder ser obtido, falha com erro claro.
  let email: string | undefined;
  try {
    const clerkUserId = getAuth(req).userId;
    if (clerkUserId) {
      const user = await clerkClient.users.getUser(clerkUserId);
      email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses[0]?.emailAddress;
    }
  } catch (err) {
    req.log.error({ err }, "Falha ao obter e-mail da conta no Clerk");
  }
  if (!email) {
    res.status(400).json({
      error:
        "Não foi possível obter o e-mail da sua conta. Recarregue a página e tente novamente.",
    });
    return;
  }

  const existing = await findRow(req.userId!);
  if (existing && existing.status !== "inativa") {
    res.status(409).json({ error: "Você já possui uma assinatura ativa." });
    return;
  }

  try {
    const customer = await createCustomer({
      name: nome,
      cpfCnpj: cpfCnpj.replace(/\D/g, ""),
      email,
      mobilePhone: telefone ? telefone.replace(/\D/g, "") : undefined,
    });

    const subscription = await createSubscription({
      customer: customer.id,
      value: plan.valueCents / 100,
      cycle: plan.cycle,
      nextDueDate: todayIso(),
      description: plan.description,
    });

    let payments: AsaasPayment[] = [];
    try {
      payments = await listSubscriptionPayments(subscription.id);
    } catch (err) {
      req.log.error({ err }, "Falha ao listar pagamentos após criar assinatura");
    }

    const values = {
      lawyerRef: req.userId!,
      asaasCustomerId: customer.id,
      asaasSubscriptionId: subscription.id,
      plan: plano,
      status: "pendente",
      valueCents: plan.valueCents,
      cycle: plan.cycle,
      customerName: nome,
      customerEmail: email,
      nextDueDate: subscription.nextDueDate ?? todayIso(),
      // Reassinatura de uma conta que JÁ existe (usuário autenticado): não há
      // provisionamento a fazer, então marcamos accountProvisionedAt para o
      // webhook não tentar recriar a conta nem enviar o e-mail "Conta criada".
      // Esta rota não passa por lead, então leadId permanece nulo.
      leadId: null,
      accountProvisionedAt: new Date(),
      // Reassinatura: limpa qualquer cancelamento anterior para não herdar o
      // período de carência nem o motivo da assinatura antiga.
      canceledAt: null,
      accessUntil: null,
      cancelReason: null,
      updatedAt: new Date(),
    };

    let row: SubscriptionRow;
    if (existing) {
      [row] = await db
        .update(subscriptionsTable)
        .set(values)
        .where(eq(subscriptionsTable.id, existing.id))
        .returning();
    } else {
      [row] = await db.insert(subscriptionsTable).values(values).returning();
    }

    const status = deriveStatus(row, payments);

    // Envia instruções de pagamento (best-effort, não bloqueia a resposta
    // em caso de falha no e-mail).
    const tpl = subscriptionCreatedEmail({
      nome: nome,
      planoLabel: planoLabel(plano as Plano),
      valorLabel: formatBRL(plan.valueCents),
      invoiceUrl: openInvoiceUrl(payments),
    });
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });

    res
      .status(201)
      .json(CreateAssinaturaResponse.parse(buildState(row, payments, status)));
  } catch (err) {
    if (err instanceof AsaasError) {
      req.log.error({ err }, "Erro Asaas ao criar assinatura");
      res.status(502).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// Cancela a assinatura do advogado.
router.post(
  "/assinatura/cancelar",
  requireAuth,
  async (req, res): Promise<void> => {
    const row = await resolveRowForUser(req);
  if (!row) {
    res.status(404).json({ error: "Nenhuma assinatura encontrada." });
    return;
  }

  // Motivo da pesquisa de cancelamento (opcional). Corpo ausente é aceito.
  const parsedBody = CancelAssinaturaBody.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ error: "Dados de cancelamento inválidos." });
    return;
  }
  const motivo = parsedBody.data.motivo?.trim() || null;

  // Antes de cancelar, descobre até quando o período já pago é válido, para
  // manter o perfil ativo até o fim do ciclo. O cancelamento só interrompe as
  // renovações futuras, não encerra o direito ao período já pago.
  let payments: AsaasPayment[] = [];
  let fetchOk = false;
  try {
    payments = await listSubscriptionPayments(row.asaasSubscriptionId);
    fetchOk = true;
  } catch (err) {
    req.log.error({ err }, "Falha ao listar pagamentos ao cancelar");
  }
  let accessUntil = computeAccessUntil(payments, row.cycle);

  // Fallback conservador: se a leitura de pagamentos falhou e o perfil estava
  // ativo, NÃO desativamos na hora (o advogado tem período pago vigente).
  // Preservamos a carência usando a próxima cobrança conhecida ou, na falta
  // dela, um ciclo a partir de hoje, para nunca rebaixar quem já pagou por
  // uma falha temporária da Asaas.
  if (!fetchOk && !accessUntil && row.status === "ativa") {
    accessUntil =
      row.nextDueDate && row.nextDueDate > todayIso()
        ? row.nextDueDate
        : addCycle(todayIso(), row.cycle);
  }

  try {
    await deleteSubscription(row.asaasSubscriptionId);
  } catch (err) {
    // Se a assinatura já não existir na Asaas, seguimos com o cancelamento local.
    if (err instanceof AsaasError && err.status !== 404) {
      req.log.error({ err }, "Erro Asaas ao cancelar assinatura");
      res.status(502).json({ error: err.message });
      return;
    }
  }

  // Se ainda há período pago vigente, o perfil permanece "ativa" até
  // accessUntil; caso contrário, torna-se "inativa" imediatamente.
  const now = new Date();
  const aindaVigente = !!accessUntil && todayIso() < accessUntil;
  const novoStatus: SubStatus = aindaVigente ? "ativa" : "inativa";

  const [updated] = await db
    .update(subscriptionsTable)
    .set({
      status: novoStatus,
      canceledAt: now,
      accessUntil: aindaVigente ? accessUntil : null,
      cancelReason: motivo,
      updatedAt: now,
    })
    .where(eq(subscriptionsTable.id, row.id))
    .returning();

  res.json(
    CancelAssinaturaResponse.parse(buildState(updated, payments, novoStatus)),
  );
  },
);

// Solicitação de reembolso (direito de arrependimento, 7 dias). Estorna o
// pagamento na Asaas, cancela a assinatura recorrente e EXCLUI o perfil do
// advogado automaticamente. Só é permitido dentro do prazo legal.
router.post(
  "/assinatura/reembolso",
  requireAuth,
  async (req, res): Promise<void> => {
    const row = await resolveRowForUser(req);
    if (!row) {
      res.status(404).json({ error: "Nenhuma assinatura encontrada." });
      return;
    }

    // Motivo da pesquisa (opcional), mesmo corpo do cancelamento.
    const parsedBody = SolicitarReembolsoBody.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      res.status(400).json({ error: "Dados de reembolso inválidos." });
      return;
    }
    const motivo = parsedBody.data.motivo?.trim() || null;

    // Reembolso mexe com dinheiro: exigimos a listagem de pagamentos com
    // sucesso para validar o prazo e saber o que estornar. Se a Asaas falhar,
    // não prosseguimos (nunca excluímos o perfil sem confirmar o estorno).
    let payments: AsaasPayment[];
    try {
      payments = await listSubscriptionPayments(row.asaasSubscriptionId);
    } catch (err) {
      req.log.error({ err }, "Falha ao listar pagamentos ao reembolsar");
      res.status(502).json({
        error: "Não foi possível consultar seus pagamentos. Tente novamente.",
      });
      return;
    }

    if (!isRefundEligible(payments)) {
      res.status(409).json({
        error:
          "O prazo de 7 dias para reembolso já passou ou não há pagamento a estornar.",
      });
      return;
    }

    const paidPayments = payments.filter((p) => PAID_STATUSES.has(p.status));

    // Ordem importa para manter o estado consistente e permitir novas tentativas
    // seguras: PRIMEIRO cancelamos a assinatura recorrente (interrompe cobranças
    // futuras), DEPOIS estornamos, e só então excluímos os dados locais. Se algo
    // falhar no meio, nada local é apagado e o botão continua disponível (o
    // pagamento segue pago e dentro do prazo), então o advogado pode repetir: um
    // DELETE já feito retorna 404 (tratado como ok) e estornos já feitos não são
    // refeitos (só estornamos pagamentos ainda em status pago).
    try {
      await deleteSubscription(row.asaasSubscriptionId);
    } catch (err) {
      if (err instanceof AsaasError && err.status !== 404) {
        req.log.error({ err }, "Erro Asaas ao cancelar assinatura no reembolso");
        res.status(502).json({ error: err.message });
        return;
      }
    }

    try {
      for (const p of paidPayments) {
        await refundPayment(p.id);
      }
    } catch (err) {
      if (err instanceof AsaasError) {
        req.log.error({ err }, "Erro Asaas ao estornar pagamento");
        res.status(502).json({ error: err.message });
        return;
      }
      throw err;
    }

    // Exclui o perfil do advogado e a assinatura local (teardown completo).
    // Usa o id da conta autenticada (row.lawyerRef pode ser nulo antes do
    // vínculo, mas resolveRowForUser já o backfila para o usuário atual).
    await db
      .delete(advogadosTable)
      .where(eq(advogadosTable.userId, req.userId!));
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.id, row.id));

    req.log.info(
      { lawyerRef: req.userId, motivo, estornos: paidPayments.length },
      "Reembolso processado e perfil excluído",
    );

    res.json(SolicitarReembolsoResponse.parse(EMPTY_STATE));
  },
);

// Aceita apenas chamadas vindas do próprio site (mesma regra de /verificar-oab).
// Em produção os domínios públicos estão em REPLIT_DOMAINS; sem allowlist
// configurada (dev), libera. Protege o checkout público contra abuso externo.
function origemPermitida(req: Request): boolean {
  const permitidos = (process.env["REPLIT_DOMAINS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!permitidos.length) return true;
  const origem = req.get("origin") || req.get("referer") || "";
  if (!origem) return false;
  try {
    const host = new URL(origem).host;
    return permitidos.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// Checkout anônimo: chamado ao fim do funil de cadastro, ANTES de existir conta.
// Cria o cliente e a assinatura recorrente na Asaas a partir dos dados do lead e
// devolve o link da fatura hospedada (invoiceUrl) para o pagamento com cartão.
// NENHUMA conta é criada aqui: a conta só é provisionada quando o pagamento é
// confirmado (webhook). Chamar de novo sempre inicia um checkout novo (nova
// assinatura Asaas), reutilizando a MESMA linha da assinatura (chaveada por
// leadId) e zerando o provisionamento anterior.
router.post("/checkout", async (req, res): Promise<void> => {
  if (!origemPermitida(req)) {
    res.status(403).json({ error: "Origem não autorizada" });
    return;
  }
  const parsed = IniciarCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { leadId, plano, nome, email, cpfCnpj, telefone } = parsed.data;
  const plan = PLANS[plano as Plano];

  // O checkout anônimo precisa corresponder a um lead real do funil, e o e-mail
  // enviado deve ser o mesmo do lead (é ele que provisiona a conta depois do
  // pagamento). Isso evita criar cobranças na Asaas com dados arbitrários.
  const [lead] = await db
    .select()
    .from(cadastroLeadsTable)
    .where(eq(cadastroLeadsTable.leadId, leadId))
    .limit(1);
  if (!lead) {
    res
      .status(400)
      .json({ error: "Cadastro não encontrado. Reinicie o cadastro." });
    return;
  }
  if (lead.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    res
      .status(400)
      .json({ error: "O e-mail não confere com o cadastro. Reinicie o cadastro." });
    return;
  }

  try {
    const customer = await createCustomer({
      name: nome,
      cpfCnpj: cpfCnpj.replace(/\D/g, ""),
      email,
      mobilePhone: telefone ? telefone.replace(/\D/g, "") : undefined,
    });

    const subscription = await createSubscription({
      customer: customer.id,
      value: plan.valueCents / 100,
      cycle: plan.cycle,
      nextDueDate: todayIso(),
      description: plan.description,
    });

    let payments: AsaasPayment[] = [];
    try {
      payments = await listSubscriptionPayments(subscription.id);
    } catch (err) {
      req.log.error(
        { err },
        "Falha ao listar pagamentos após criar checkout",
      );
    }

    const invoiceUrl = openInvoiceUrl(payments);
    if (!invoiceUrl) {
      req.log.error(
        { subscriptionId: subscription.id },
        "Checkout sem invoiceUrl da Asaas",
      );
      res.status(502).json({
        error:
          "Não foi possível gerar o link de pagamento. Tente novamente em instantes.",
      });
      return;
    }

    const values = {
      // Sem conta ainda: o vínculo com o advogado (lawyerRef) só acontece após
      // o pagamento e o primeiro login. A assinatura nasce chaveada pelo e-mail.
      lawyerRef: null,
      leadId,
      asaasCustomerId: customer.id,
      asaasSubscriptionId: subscription.id,
      plan: plano,
      status: "pendente",
      valueCents: plan.valueCents,
      cycle: plan.cycle,
      customerName: nome,
      customerEmail: email,
      nextDueDate: subscription.nextDueDate ?? todayIso(),
      // Checkout novo: zera qualquer provisionamento/cancelamento anterior desta
      // mesma tentativa de cadastro (o advogado voltou ao funil).
      accountProvisionedAt: null,
      canceledAt: null,
      accessUntil: null,
      cancelReason: null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.leadId, leadId));

    if (existing) {
      // Re-checkout do mesmo lead: cancela a assinatura Asaas anterior (ainda
      // pendente) antes de sobrescrever o vínculo. Sem isso, um pagamento feito
      // no link antigo dispararia webhooks para um asaasSubscriptionId que não
      // existe mais na linha, e a conta nunca seria provisionada.
      if (
        existing.asaasSubscriptionId &&
        existing.asaasSubscriptionId !== subscription.id
      ) {
        try {
          await deleteSubscription(existing.asaasSubscriptionId);
        } catch (err) {
          req.log.error(
            { err, previous: existing.asaasSubscriptionId },
            "Falha ao remover assinatura Asaas anterior no re-checkout",
          );
        }
      }
      await db
        .update(subscriptionsTable)
        .set(values)
        .where(eq(subscriptionsTable.id, existing.id));
    } else {
      await db.insert(subscriptionsTable).values(values);
    }

    res.status(201).json(IniciarCheckoutResponse.parse({ invoiceUrl }));
  } catch (err) {
    if (err instanceof AsaasError) {
      req.log.error({ err }, "Erro Asaas ao iniciar checkout");
      res.status(502).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// Webhook da Asaas (configurado no painel Asaas). Atualiza o status conforme
// os eventos de pagamento. Não faz parte do contrato OpenAPI (rota externa).
router.post("/assinatura/webhook", async (req, res): Promise<void> => {
  const expectedToken = process.env["ASAAS_WEBHOOK_TOKEN"];
  if (expectedToken) {
    const provided = req.header("asaas-access-token");
    if (provided !== expectedToken) {
      res.sendStatus(401);
      return;
    }
  }

  const body = req.body as {
    event?: string;
    payment?: { subscription?: string | null };
  };
  const event = body?.event;
  const subscriptionId = body?.payment?.subscription;

  if (!event || !subscriptionId) {
    res.sendStatus(200);
    return;
  }

  let newStatus: SubscriptionRow["status"] | null = null;
  if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
    newStatus = "ativa";
  } else if (event === "PAYMENT_OVERDUE") {
    newStatus = "atrasada";
  } else if (event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
    newStatus = "inativa";
  }

  // Provisionamento da conta no PRIMEIRO pagamento confirmado (checkout
  // primeiro). Desacoplado da transição de status para poder ser reexecutado
  // por eventos posteriores caso o Clerk falhe. A "reivindicação" de
  // accountProvisionedAt é atômica (condicional a isNull), evitando e-mails
  // duplicados sob entregas concorrentes/repetidas. Se o provisionamento
  // falhar, desfazemos a reivindicação para uma nova tentativa depois.
  let justProvisioned = false;
  if (newStatus === "ativa") {
    const [row] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.asaasSubscriptionId, subscriptionId));
    if (row && !row.accountProvisionedAt && row.customerEmail?.trim()) {
      const [claimed] = await db
        .update(subscriptionsTable)
        .set({ accountProvisionedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(subscriptionsTable.id, row.id),
            isNull(subscriptionsTable.accountProvisionedAt),
          ),
        )
        .returning();
      if (claimed && claimed.customerEmail) {
        try {
          const entrarUrl = await createAccountInvitation(
            claimed.customerEmail,
            req.log,
          );
          const tpl = accountCreatedEmail({
            nome: claimed.customerName,
            entrarUrl,
          });
          await sendEmail({
            to: claimed.customerEmail,
            subject: tpl.subject,
            html: tpl.html,
          });
          justProvisioned = true;
          req.log.info(
            { subscriptionId },
            "Conta provisionada após pagamento confirmado",
          );
        } catch (err) {
          req.log.error(
            { err, subscriptionId },
            "Falha ao provisionar conta; desfazendo reivindicação",
          );
          await db
            .update(subscriptionsTable)
            .set({ accountProvisionedAt: null })
            .where(eq(subscriptionsTable.id, claimed.id));
        }
      }
    }
  }

  if (newStatus) {
    // Atualiza apenas quando há mudança real de status. O .returning() só
    // devolve a linha se ela foi alterada, tornando a deduplicação segura
    // mesmo sob entregas concorrentes ou repetidas do webhook (a Asaas
    // dispara PAYMENT_CONFIRMED e PAYMENT_RECEIVED para o mesmo pagamento).
    // Assinaturas canceladas NÃO são tocadas pelo webhook: o status delas é
    // autoritativamente baseado em data (accessUntil), então um evento tardio
    // da Asaas nunca deve rebaixar quem ainda está no período pago.
    const [changed] = await db
      .update(subscriptionsTable)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(
        and(
          eq(subscriptionsTable.asaasSubscriptionId, subscriptionId),
          ne(subscriptionsTable.status, newStatus),
          isNull(subscriptionsTable.canceledAt),
        ),
      )
      .returning();

    if (changed) {
      req.log.info(
        { event, subscriptionId, newStatus },
        "Webhook Asaas aplicado",
      );

      if (changed.customerEmail) {
        if (newStatus === "ativa" && !justProvisioned) {
          // Pagamento confirmado de uma conta que já existe (renovação ou
          // recuperação de atraso). No primeiro pagamento não enviamos este
          // e-mail: o de "Conta criada" já foi enviado no provisionamento.
          const tpl = paymentConfirmedEmail(changed.customerName);
          await sendEmail({
            to: changed.customerEmail,
            subject: tpl.subject,
            html: tpl.html,
          });
        } else if (newStatus === "atrasada") {
          // Busca a fatura em aberto para incluir o link "Regularizar agora".
          let invoiceUrl: string | null = null;
          try {
            invoiceUrl = openInvoiceUrl(
              await listSubscriptionPayments(subscriptionId),
            );
          } catch (err) {
            req.log.error(
              { err },
              "Falha ao buscar fatura para e-mail de atraso",
            );
          }
          const tpl = paymentOverdueEmail({
            nome: changed.customerName,
            invoiceUrl,
          });
          await sendEmail({
            to: changed.customerEmail,
            subject: tpl.subject,
            html: tpl.html,
          });
        }
      }
    }
  }

  res.sendStatus(200);
});

export default router;
