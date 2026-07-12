import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Exige um usuário autenticado via Clerk. Em caso de sucesso, popula
// req.userId com o id do psicólogo autenticado (usado como chave única
// em perfis e assinaturas).
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);
  const userId =
    (auth?.sessionClaims as { userId?: string } | undefined)?.userId ||
    auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  req.userId = userId;
  next();
}
