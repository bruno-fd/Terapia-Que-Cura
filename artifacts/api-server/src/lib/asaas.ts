import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Cliente mínimo da API Asaas (https://docs.asaas.com).
// A base vem de ASAAS_BASE_URL. Hoje TANTO desenvolvimento quanto produção
// apontam para a API REAL do Asaas (https://api.asaas.com/v3): o sandbox foi
// removido do ambiente de desenvolvimento a pedido, para facilitar o teste com
// dados reais. O código ainda seleciona a chave pela URL base (segredos no
// Replit são globais, não separados por ambiente), então continua compatível
// caso ASAAS_BASE_URL volte a apontar para o sandbox:
//   - Produção (api.asaas.com)     -> ASAAS_API_KEY_PROD ($aact_prod_...)
//   - Sandbox  (sandbox.asaas.com) -> ASAAS_API_KEY      ($aact_hmlg_...)
// Nunca logamos a chave.
// ---------------------------------------------------------------------------

const ASAAS_BASE_URL =
  process.env["ASAAS_BASE_URL"] ?? "https://api.asaas.com/v3";

// true quando apontamos para a API de produção do Asaas.
const IS_PRODUCTION_ASAAS = /(^|\/\/)api\.asaas\.com/i.test(ASAAS_BASE_URL);

function getApiKey(): string {
  const key = IS_PRODUCTION_ASAAS
    ? process.env["ASAAS_API_KEY_PROD"]
    : process.env["ASAAS_API_KEY"];
  if (!key) {
    throw new Error(
      IS_PRODUCTION_ASAAS
        ? "ASAAS_API_KEY_PROD não configurada (chave de produção do Asaas)."
        : "ASAAS_API_KEY não configurada.",
    );
  }
  return key;
}

// Indica se a chave do Asaas para o ambiente atual está configurada. Usado para
// decidir, sem lançar exceção, se o registro do webhook deve rodar.
export function isAsaasConfigured(): boolean {
  return IS_PRODUCTION_ASAAS
    ? Boolean(process.env["ASAAS_API_KEY_PROD"])
    : Boolean(process.env["ASAAS_API_KEY"]);
}

export class AsaasError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AsaasError";
    this.status = status;
  }
}

async function asaasFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const url = `${ASAAS_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      access_token: getApiKey(),
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let message = `Erro Asaas (${res.status}).`;
    try {
      const data = (await res.json()) as {
        errors?: { description?: string }[];
      };
      const desc = data?.errors?.[0]?.description;
      if (desc) message = desc;
    } catch {
      // resposta sem JSON
    }
    logger.error({ status: res.status, path }, "Falha na chamada à Asaas");
    throw new AsaasError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Tipos parciais das respostas da Asaas (apenas o que usamos).
// ---------------------------------------------------------------------------
export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  cycle: string;
  status: string;
  nextDueDate: string | null;
  // Presentes na listagem; usados para casar a assinatura recém-criada por um
  // Asaas Checkout pago (externalReference = leadId; dateCreated como desempate).
  externalReference?: string | null;
  dateCreated?: string | null;
}

export type AsaasPaymentStatus =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "OVERDUE"
  | "REFUNDED"
  | "RECEIVED_IN_CASH"
  | "REFUND_REQUESTED"
  | "CHARGEBACK_REQUESTED"
  | "AWAITING_RISK_ANALYSIS"
  | "DELETED"
  | string;

export interface AsaasPayment {
  id: string;
  subscription: string | null;
  value: number;
  description: string | null;
  status: AsaasPaymentStatus;
  dueDate: string | null;
  paymentDate: string | null;
  invoiceUrl: string | null;
}

interface AsaasList<T> {
  data: T[];
}

// ---------------------------------------------------------------------------
// Asaas Checkout (https://docs.asaas.com/reference/create-new-checkout).
// Página de pagamento hospedada e mais limpa que a fatura antiga (invoiceUrl):
// não exibe o cabeçalho com CNPJ/endereço da empresa. O fluxo é invertido em
// relação à assinatura direta: a assinatura recorrente só é criada pela Asaas
// DEPOIS que o pagador conclui o pagamento; até lá temos apenas o id do
// checkout. Vinculamos a linha da nossa tabela pelo id do checkout e, no evento
// CHECKOUT_PAID, descobrimos o id da assinatura recém-criada.
// ---------------------------------------------------------------------------

// Base pública onde o pagador acessa a página do checkout (difere da API):
// produção usa asaas.com; sandbox usa sandbox.asaas.com.
const ASAAS_CHECKOUT_WEB_BASE = IS_PRODUCTION_ASAAS
  ? "https://asaas.com"
  : "https://sandbox.asaas.com";

export interface AsaasCheckout {
  id: string;
  // A Asaas pode devolver o link direto; quando ausente, montamos a partir do id.
  link?: string | null;
  status?: string;
  // Presente no payload do webhook (id do cliente criado pela Asaas no pagamento).
  customer?: string | null;
}

export interface CreateCheckoutInput {
  value: number; // valor recorrente em reais
  cycle: "MONTHLY" | "YEARLY";
  nextDueDate: string; // yyyy-mm-dd (primeira cobrança)
  itemName: string; // nome do item exibido na página (ex.: "Plano Mensal")
  itemDescription: string;
  successUrl: string;
  cancelUrl: string;
  expiredUrl: string;
  externalReference: string; // nosso identificador (leadId ou user:<id>)
  customer: {
    name: string;
    cpfCnpj: string;
    email: string;
    phone?: string;
  };
}

export function createCheckout(
  input: CreateCheckoutInput,
): Promise<AsaasCheckout> {
  return asaasFetch<AsaasCheckout>("/checkouts", {
    method: "POST",
    body: {
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      // 24h para concluir o pagamento; depois o checkout expira.
      minutesToExpire: 1440,
      callback: {
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        expiredUrl: input.expiredUrl,
      },
      items: [
        {
          name: input.itemName,
          description: input.itemDescription,
          quantity: 1,
          value: input.value,
        },
      ],
      // customerData: a Asaas exige telefone E endereço completo para
      // pré-preencher o checkout. Como não coletamos endereço no funil,
      // omitimos customerData e a Asaas coleta todos os dados na própria
      // página de pagamento. (Jul/2026 — ao coletar endereço no funil,
      // reativar o bloco abaixo adicionando o campo address.)
      //
      // ...(input.customer?.phone ? { customerData: { name, cpfCnpj, email, phone, address: { ... } } } : {}),
      subscription: {
        cycle: input.cycle,
        nextDueDate: input.nextDueDate,
      },
      externalReference: input.externalReference,
    },
  });
}

// URL pública da página de checkout. Prefere o link devolvido pela Asaas; se
// ausente, monta a partir do id na base do ambiente atual.
export function buildCheckoutUrl(checkout: AsaasCheckout): string {
  return (
    checkout.link ??
    `${ASAAS_CHECKOUT_WEB_BASE}/checkoutSession/show?id=${checkout.id}`
  );
}

// Cancela um checkout ainda não pago (best-effort). Usado ao reiniciar o
// checkout para que um link antigo não permaneça pagável em paralelo.
export async function cancelCheckout(id: string): Promise<void> {
  await asaasFetch(`/checkouts/${id}/cancel`, { method: "POST" });
}

// Lista as assinaturas de um cliente. Usado no CHECKOUT_PAID para localizar a
// assinatura recorrente que a Asaas acabou de criar para aquele cliente.
export async function listSubscriptionsByCustomer(
  customerId: string,
): Promise<AsaasSubscription[]> {
  const result = await asaasFetch<AsaasList<AsaasSubscription>>(
    `/subscriptions?customer=${encodeURIComponent(customerId)}&limit=100`,
  );
  return result.data ?? [];
}

export async function listSubscriptionPayments(
  subscriptionId: string,
): Promise<AsaasPayment[]> {
  const result = await asaasFetch<AsaasList<AsaasPayment>>(
    `/subscriptions/${subscriptionId}/payments`,
  );
  return result.data ?? [];
}

export function deleteSubscription(subscriptionId: string): Promise<unknown> {
  return asaasFetch(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}

export function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

// Estorna (reembolsa) integralmente um pagamento já pago. Sem corpo, a Asaas
// faz o estorno total do valor. Usado no direito de arrependimento (7 dias).
export function refundPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}/refund`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Webhooks. Registramos o webhook de forma programática (ver
// registerAsaasWebhook) para que um pagamento confirmado atualize o status da
// assinatura automaticamente, sem depender de configuração manual no painel.
// ---------------------------------------------------------------------------
export interface AsaasWebhook {
  id?: string;
  name: string;
  url: string;
  email?: string;
  enabled: boolean;
  interrupted: boolean;
  apiVersion?: number;
  authToken?: string | null;
  sendType: "SEQUENTIALLY" | "NON_SEQUENTIALLY";
  events: string[];
}

export async function listWebhooks(): Promise<AsaasWebhook[]> {
  const result = await asaasFetch<AsaasList<AsaasWebhook>>("/webhooks");
  return result.data ?? [];
}

export function createWebhook(input: AsaasWebhook): Promise<AsaasWebhook> {
  return asaasFetch<AsaasWebhook>("/webhooks", {
    method: "POST",
    body: input,
  });
}

export function updateWebhook(
  id: string,
  input: Partial<AsaasWebhook>,
): Promise<AsaasWebhook> {
  return asaasFetch<AsaasWebhook>(`/webhooks/${id}`, {
    method: "PUT",
    body: input,
  });
}

// Dados da conta Asaas; usamos o e-mail como destino padrão das notificações
// de falha do webhook quando ASAAS_WEBHOOK_EMAIL não está definido.
export interface AsaasAccount {
  email: string | null;
}

export function getMyAccount(): Promise<AsaasAccount> {
  return asaasFetch<AsaasAccount>("/myAccount");
}
