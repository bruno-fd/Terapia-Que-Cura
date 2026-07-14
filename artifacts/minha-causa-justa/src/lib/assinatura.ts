import {
  iniciarCheckout as iniciarCheckoutApi,
  type SubscriptionState,
  type CreateSubscriptionInput,
  type CheckoutInput,
  type CheckoutResult,
} from "@workspace/api-client-react";

// ============================================================
// Chamadas à API de assinatura (Asaas). O psicólogo é
// identificado pela sessão autenticada (Clerk) no back-end;
// o cookie de sessão vai junto por ser mesma origem (/api).
// ============================================================

const API_BASE = "/api";

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let message = "Ocorreu um erro na operação.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // resposta sem corpo JSON
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type {
  SubscriptionState,
  CreateSubscriptionInput,
  CheckoutInput,
  CheckoutResult,
};

// Inicia o checkout ANÔNIMO (sem conta): cria um Asaas Checkout (página de
// pagamento hospedada, sem o banner da empresa) atrelado ao lead e devolve a
// sua URL (checkoutUrl). A assinatura e a conta do psicólogo só são criadas
// pelo back-end APÓS o webhook confirmar o pagamento (CHECKOUT_PAID).
export function iniciarCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  return iniciarCheckoutApi(input);
}

export function getAssinatura(): Promise<SubscriptionState> {
  return apiFetch("/assinatura");
}

// Reassinatura (conta já existente): cria um Asaas Checkout e devolve a sua URL
// (checkoutUrl) para redirecionar o psicólogo ao pagamento. A assinatura na
// Asaas nasce apenas após o pagamento confirmado.
export function createAssinatura(
  input: CreateSubscriptionInput,
): Promise<CheckoutResult> {
  return apiFetch("/assinatura", { method: "POST", body: input });
}

export function cancelAssinatura(
  motivo?: string,
): Promise<SubscriptionState> {
  return apiFetch("/assinatura/cancelar", {
    method: "POST",
    body: motivo ? { motivo } : {},
  });
}

export function solicitarReembolso(
  motivo?: string,
): Promise<SubscriptionState> {
  return apiFetch("/assinatura/reembolso", {
    method: "POST",
    body: motivo ? { motivo } : {},
  });
}
