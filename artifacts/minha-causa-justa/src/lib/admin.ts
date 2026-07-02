import type {
  BlogPost as ApiBlogPost,
  AdminAdvogado,
  AdminAdvogadoDetail,
  UpdateAdminAdvogadoInput,
} from "@workspace/api-client-react";

// ============================================================
// Autenticação simulada do painel /admin (senha única no cliente)
// e chamadas autenticadas à API de geração de posts.
// ============================================================

const ADMIN_STORAGE_KEY = "mcj_admin_password";
const API_BASE = "/api";

export function getAdminPassword(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminPassword(password: string): void {
  try {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, password);
  } catch {
    // sessionStorage indisponível: o estado em memória cuida da sessão
  }
}

export function clearAdminPassword(): void {
  try {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function adminFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const password = getAdminPassword();
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "x-admin-password": password ?? "",
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    throw new Error("Senha de administrador inválida.");
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
