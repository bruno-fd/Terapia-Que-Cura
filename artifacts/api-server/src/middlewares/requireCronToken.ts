import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

// Comparação em tempo constante, resistente a timing attacks. Retorna false se
// os tamanhos diferem (sem vazar o tamanho esperado por diferença de tempo
// relevante na prática).
function seguraIgual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// Protege o endpoint interno de disparo do gerador diário. O chamador (o
// "despertador" agendado, um projeto separado) precisa enviar o header
// `Authorization: Bearer <token>`, comparado com o secret BLOG_CRON_TOKEN.
// Sem o secret configurado, o endpoint fica indisponível (503) em vez de aberto.
export function requireCronToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env["BLOG_CRON_TOKEN"];
  if (!expected) {
    res
      .status(503)
      .json({ error: "Gatilho do gerador não configurado (BLOG_CRON_TOKEN)." });
    return;
  }

  const header = req.get("authorization") ?? "";
  const prefix = "Bearer ";
  const provided = header.startsWith(prefix)
    ? header.slice(prefix.length)
    : "";

  if (!provided || !seguraIgual(provided, expected)) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }

  next();
}
