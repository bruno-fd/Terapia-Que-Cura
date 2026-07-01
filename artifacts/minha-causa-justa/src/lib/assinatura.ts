import type {
  SubscriptionState,
  CreateSubscriptionInput,
} from "@workspace/api-client-react";

// ============================================================
// Chamadas à API de assinatura (Asaas). O advogado é
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

export type { SubscriptionState, CreateSubscriptionInput };

export function getAssinatura(): Promise<SubscriptionState> {
  return apiFetch("/assinatura");
}

export function createAssinatura(
  input: CreateSubscriptionInput,
): Promise<SubscriptionState> {
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
