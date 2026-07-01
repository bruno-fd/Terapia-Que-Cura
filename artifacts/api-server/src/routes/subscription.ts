import { Router, type IRouter } from "express";
import { eq, and, ne } from "drizzle-orm";
import { db, subscriptionsTable, type SubscriptionRow } from "@workspace/db";
import {
  GetAssinaturaResponse,
  CreateAssinaturaBody,
  CreateAssinaturaResponse,
  CancelAssinaturaResponse,
} from "@workspace/api-zod";
import {
  createCustomer,
  createSubscription,
  listSubscriptionPayments,
  deleteSubscription,
  AsaasError,
  type AsaasPayment,
} from "../lib/asaas";
import { requireAuth } from "../middlewares/requireAuth";
import { sendEmail } from "../lib/email";
import {
  subscriptionCreatedEmail,
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

// Estado geral da assinatura, derivado dos pagamentos da Asaas. O webhook
// também atualiza o status; aqui derivamos ao vivo para o painel funcionar
// mesmo antes de qualquer webhook chegar.
function deriveStatus(
  row: SubscriptionRow,
  payments: AsaasPayment[],
): SubStatus {
  if (row.status === "inativa") return "inativa";
  const hasOverdue = payments.some((p) => p.status === "OVERDUE");
  if (hasOverdue) return "atrasada";
  const hasPaid = payments.some((p) => PAID_STATUSES.has(p.status));
  if (hasPaid) return "ativa";
  return "pendente";
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

// Estado atual da assinatura do advogado.
router.get("/assinatura", requireAuth, async (req, res): Promise<void> => {
  const row = await findRow(req.userId!);
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

  // Só recalcula/persiste o status quando os pagamentos foram obtidos com
  // sucesso. Numa falha temporária da Asaas, mantemos o status persistido
  // para não rebaixar uma assinatura ativa por engano.
  const status = fetched
    ? deriveStatus(row, payments)
    : (row.status as SubStatus);
  if (fetched && status !== row.status) {
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
  const { plano, nome, cpfCnpj, email, telefone } = parsed.data;
  const plan = PLANS[plano as Plano];

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
    const row = await findRow(req.userId!);
  if (!row) {
    res.status(404).json({ error: "Nenhuma assinatura encontrada." });
    return;
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

  const [updated] = await db
    .update(subscriptionsTable)
    .set({ status: "inativa", updatedAt: new Date() })
    .where(eq(subscriptionsTable.id, row.id))
    .returning();

  res.json(CancelAssinaturaResponse.parse(buildState(updated, [], "inativa")));
  },
);

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

  if (newStatus) {
    // Atualiza apenas quando há mudança real de status. O .returning() só
    // devolve a linha se ela foi alterada, tornando a deduplicação segura
    // mesmo sob entregas concorrentes ou repetidas do webhook (a Asaas
    // dispara PAYMENT_CONFIRMED e PAYMENT_RECEIVED para o mesmo pagamento).
    const [changed] = await db
      .update(subscriptionsTable)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(
        and(
          eq(subscriptionsTable.asaasSubscriptionId, subscriptionId),
          ne(subscriptionsTable.status, newStatus),
        ),
      )
      .returning();

    if (changed) {
      req.log.info(
        { event, subscriptionId, newStatus },
        "Webhook Asaas aplicado",
      );

      if (changed.customerEmail) {
        if (newStatus === "ativa") {
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
