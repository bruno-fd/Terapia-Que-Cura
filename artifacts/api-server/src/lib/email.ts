import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Envio de e-mails transacionais via Resend.
// Integração: conector Resend da Replit (blueprint "resend"). O SDK
// @replit/connectors-sdk cuida da identidade e do refresh de token
// automaticamente; nunca lidamos com a chave de API diretamente.
//
// Remetente: definido por EMAIL_FROM (padrão contato@minhacausajusta.com.br).
// IMPORTANTE: o domínio do remetente precisa estar verificado no Resend para
// que os envios funcionem em produção.
// ---------------------------------------------------------------------------

const connectors = new ReplitConnectors();

const EMAIL_FROM =
  process.env["EMAIL_FROM"] ??
  "Minha Causa Justa <contato@minhacausajusta.com.br>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Envio best-effort: nunca lança. Em caso de falha apenas registra o erro,
// para não quebrar os fluxos de assinatura/cadastro por causa do e-mail.
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!input.to) {
    logger.warn("sendEmail chamado sem destinatário");
    return false;
  }
  try {
    const res = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: {
        from: EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      },
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        // resposta sem corpo
      }
      logger.error(
        { status: res.status, detail },
        "Falha ao enviar e-mail (Resend)",
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Erro ao enviar e-mail (Resend)");
    return false;
  }
}
