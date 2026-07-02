import type { Request, Response, NextFunction } from "express";

// Guarda simples do admin: senha única hardcoded, conferida no header
// x-admin-password. Não é autenticação real (por ora, por design). Usada tanto
// pela geração de blog quanto pela aba de verificação de advogados.
export const ADMIN_PASSWORD = "123456";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const provided = req.header("x-admin-password");
  if (provided !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }
  next();
}
