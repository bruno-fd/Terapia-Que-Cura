import type {
  SubscriptionState,
  CreateSubscriptionInput,
} from "@workspace/api-client-react";

// ============================================================
// Chamadas à API de assinatura (Asaas). Modo demonstração: o
// back-end usa um advogado fixo, sem login real ainda.
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

export function cancelAssinatura(): Promise<SubscriptionState> {
  return apiFetch("/assinatura/cancelar", { method: "POST" });
}
