import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";

// Lista de e-mails autorizados a acessar o painel administrativo. Por ora, só
// bf.damasio@gmail.com. Pode ser expandida/sobrescrita pela env ADMIN_EMAILS
// (lista separada por vírgula). A comparação é sempre case-insensitive.
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

// Guarda do admin: exige um usuário autenticado via Clerk (sessão do navegador)
// cujo e-mail principal esteja na lista de administradores. Substitui a antiga
// senha única. 401 se não autenticado; 403 se autenticado sem permissão. Usada
// tanto pela geração de blog quanto pela aba de verificação de advogados.
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "Faça login para acessar o painel." });
      return;
    }
    const user = await clerkClient.users.getUser(userId);
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null;
    if (!isAdminEmail(email)) {
      res.status(403).json({
        error: "Este e-mail não tem acesso ao painel administrativo.",
      });
      return;
    }
    req.userId = userId;
    next();
  } catch (err) {
    req.log.error({ err }, "Falha ao validar acesso de administrador");
    res.status(401).json({ error: "Não foi possível validar o acesso." });
  }
}
