import type { Request, Response, NextFunction } from "express";

// Lista de e-mails autorizados a acessar o painel administrativo. Por ora, só
// bf.damasio@gmail.com (o dono). Pode ser expandida/sobrescrita pela env
// ADMIN_EMAILS (lista separada por vírgula). Comparação sempre case-insensitive.
const DEFAULT_ADMIN_EMAILS = ["bf.damasio@gmail.com"];

function adminEmails(): string[] {
  const fromEnv = (process.env["ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const base = fromEnv.length > 0 ? fromEnv : DEFAULT_ADMIN_EMAILS;
  return base.map((e) => e.toLowerCase());
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

// Guarda do admin: exige um usuário autenticado via Replit Auth (login seguro
// do Replit, cookie de sessão "sid" carregado pelo authMiddleware) cujo e-mail
// esteja na lista de administradores. É totalmente independente da base de
// psicólogos (Clerk): o painel é do dono da empresa. 401 se não autenticado;
// 403 se autenticado sem permissão. Usada pela geração de blog e pela aba de
// verificação de psicólogos.
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Faça login para acessar o painel." });
    return;
  }
  const email = req.user.email;
  if (!isAdminEmail(email)) {
    res.status(403).json({
      error: "Esta conta não tem acesso ao painel administrativo.",
    });
    return;
  }
  req.userId = req.user.id;
  next();
}
