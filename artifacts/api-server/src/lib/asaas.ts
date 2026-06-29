import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Cliente mínimo da API Asaas (https://docs.asaas.com).
// A URL base e a chave variam por ambiente:
//   - Sandbox:   https://sandbox.asaas.com/api/v3  (chave $aact_hmlg_...)
//   - Produção:  https://api.asaas.com/v3          (chave $aact_prod_...)
// Definimos a base por ASAAS_BASE_URL (padrão sandbox) e a chave por
// ASAAS_API_KEY (segredo). Nunca logamos a chave.
// ---------------------------------------------------------------------------

const ASAAS_BASE_URL =
  process.env["ASAAS_BASE_URL"] ?? "https://sandbox.asaas.com/api/v3";

function getApiKey(): string {
  const key = process.env["ASAAS_API_KEY"];
  if (!key) {
    throw new Error("ASAAS_API_KEY não configurada.");
  }
  return key;
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
