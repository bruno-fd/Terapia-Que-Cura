import type {
  BlogPost as ApiBlogPost,
  AdminAdvogado,
  AdminAdvogadoDetail,
  UpdateAdminAdvogadoInput,
} from "@workspace/api-client-react";

// ============================================================
// Chamadas autenticadas ao painel /admin. O acesso é controlado pela sessão
// Clerk do navegador (cookie same-origin enviado automaticamente para /api); o
// back-end exige um e-mail autorizado. Não há mais senha compartilhada.
// ============================================================

const API_BASE = "/api";

async function adminFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    throw new Error("Faça login para acessar o painel.");
  }
  if (res.status === 403) {
    throw new Error("Este e-mail não tem acesso ao painel administrativo.");
  }
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
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function generateIdeas(category: string): Promise<{ ideas: string[] }> {
  return adminFetch("/admin/blog/ideas", {
    method: "POST",
    body: { category },
  });
}

export function createPost(
  category: string,
  theme: string,
): Promise<ApiBlogPost> {
  return adminFetch("/admin/blog/posts", {
    method: "POST",
    body: { category, theme },
  });
}

export interface UpdatePostInput {
  category?: string;
  title?: string;
  subtitle?: string;
  excerpt?: string;
  bodyHtml?: string;
  oabClosing?: string;
  published?: boolean;
}

export function updatePost(
  id: number,
  input: UpdatePostInput,
): Promise<ApiBlogPost> {
  return adminFetch(`/admin/blog/posts/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function listAdminPosts(): Promise<ApiBlogPost[]> {
  return adminFetch("/admin/blog/posts");
}

export function deletePost(id: number): Promise<void> {
  return adminFetch(`/admin/blog/posts/${id}`, { method: "DELETE" });
}

// ============================================================
// Verificação de advogados (aba "Verificação" do painel /admin)
// ============================================================

export function listAdminAdvogados(): Promise<AdminAdvogado[]> {
  return adminFetch("/admin/advogados");
}

export function getAdminAdvogado(id: number): Promise<AdminAdvogadoDetail> {
  return adminFetch(`/admin/advogados/${id}`);
}

export function updateAdminAdvogado(
  id: number,
  input: UpdateAdminAdvogadoInput,
): Promise<AdminAdvogadoDetail> {
  return adminFetch(`/admin/advogados/${id}`, {
    method: "PATCH",
    body: input,
  });
}
