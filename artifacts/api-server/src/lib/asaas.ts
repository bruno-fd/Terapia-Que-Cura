import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Cliente mínimo da API Asaas (https://docs.asaas.com).
// A URL base e a chave variam por ambiente:
//   - Sandbox:   https://sandbox.asaas.com/api/v3  (chave $aact_hmlg_...)
//   - Produção:  https://api.asaas.com/v3          (chave $aact_prod_...)
// A base vem de ASAAS_BASE_URL (definida por ambiente: dev=sandbox,
// prod=produção). A chave do Asaas é diferente entre sandbox e produção, e
// segredos no Replit são globais (não separados por ambiente), então mantemos
// duas secrets e escolhemos pela URL base:
//   - Produção  -> ASAAS_API_KEY_PROD
//   - Sandbox   -> ASAAS_API_KEY
// Nunca logamos a chave.
// ---------------------------------------------------------------------------

const ASAAS_BASE_URL =
  process.env["ASAAS_BASE_URL"] ?? "https://sandbox.asaas.com/api/v3";

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

export interface CreateCustomerInput {
  name: string;
  cpfCnpj: string;
  email: string;
  mobilePhone?: string;
}

export function createCustomer(
  input: CreateCustomerInput,
): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: input,
  });
}

export interface CreateSubscriptionInput {
  customer: string;
  value: number; // em reais
  cycle: "MONTHLY" | "YEARLY";
  nextDueDate: string; // yyyy-mm-dd
  description: string;
}

export function createSubscription(
  input: CreateSubscriptionInput,
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: {
      ...input,
      // UNDEFINED deixa o cliente escolher PIX, Boleto ou Cartão na fatura.
      billingType: "UNDEFINED",
    },
  });
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
