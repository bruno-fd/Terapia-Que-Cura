// ---------------------------------------------------------------------------
// Modelos de e-mail (HTML) em português do Brasil.
// Regra de copy: nunca usar travessões ("—") em texto ao usuário.
// Estilos sempre inline, pois clientes de e-mail ignoram CSS externo.
// ---------------------------------------------------------------------------

const APP_URL = (
  process.env["APP_PUBLIC_URL"] ?? "https://minhacausajusta.com.br"
).replace(/\/$/, "");

const PRIMARY = "#2260AA";
const ACCENT = "#E86100";
const INK = "#1f2937";
const MUTED = "#6b7280";

export interface EmailContent {
  subject: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">${label}</a>`;
}

function greeting(nome?: string | null): string {
  const name = nome?.trim();
  return name ? `Olá, ${escapeHtml(name)},` : "Olá,";
}

function layout(bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:${PRIMARY};padding:20px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">Minha Causa Justa</span>
        </td></tr>
        <tr><td style="padding:32px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.5;">
            Você recebeu este e-mail porque tem um cadastro na Minha Causa Justa.<br>
            <a href="${APP_URL}" style="color:${PRIMARY};text-decoration:none;">${APP_URL.replace(/^https?:\/\//, "")}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};">${text}</p>`;
}

// 1. Boas-vindas, logo após criar a conta.
export function welcomeEmail(nome?: string | null): EmailContent {
  const steps = [
    "Escolha o seu plano (Mensal ou Anual).",
    "Pague com cartão de crédito (assinatura recorrente).",
    "Complete o seu perfil profissional.",
    "Pronto: seu perfil aparece no diretório público.",
  ]
    .map(
      (s) =>
        `<li style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${INK};">${s}</li>`,
    )
    .join("");

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:${PRIMARY};">Bem-vindo(a) à Minha Causa Justa</h1>
    ${paragraph(`${greeting(nome)} que bom ter você com a gente. Em poucos passos o seu perfil pode estar no ar para novos clientes encontrarem você.`)}
    <ol style="margin:0 0 24px;padding-left:20px;">${steps}</ol>
    ${button(`${APP_URL}/painel/assinatura`, "Começar agora")}
  `;
  return {
    subject: "Bem-vindo(a) à Minha Causa Justa",
    html: layout(body),
  };
}

// 2. Assinatura criada, instruções de pagamento.
export function subscriptionCreatedEmail(p: {
  nome?: string | null;
  planoLabel: string;
  valorLabel: string;
  invoiceUrl?: string | null;
}): EmailContent {
  const cta = p.invoiceUrl
    ? button(p.invoiceUrl, "Pagar agora")
    : button(`${APP_URL}/painel/assinatura`, "Ver minha assinatura");
  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:${PRIMARY};">Falta pouco para ativar o seu perfil</h1>
    ${paragraph(`${greeting(p.nome)} recebemos a sua assinatura do ${escapeHtml(p.planoLabel)} no valor de ${escapeHtml(p.valorLabel)}.`)}
    ${paragraph("Para ativar o seu perfil no diretório, conclua o pagamento com cartão de crédito. A assinatura é recorrente e renova automaticamente:")}
    ${cta}
    ${paragraph(`<span style="font-size:13px;color:${MUTED};">Assim que o pagamento for confirmado, avisamos você por e-mail.</span>`)}
  `;
  return {
    subject: "Finalize o pagamento da sua assinatura",
    html: layout(body),
  };
}

// 2b. Conta criada após a confirmação do pagamento (checkout primeiro). Leva o
// advogado a criar a senha e, em seguida, cair no perfil. O link "Entrar" é o
// convite do Clerk (define a senha e vincula a conta ao e-mail do pagamento).
export function accountCreatedEmail(p: {
  nome?: string | null;
  entrarUrl: string;
}): EmailContent {
  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:${PRIMARY};">Sua conta foi criada com sucesso</h1>
    ${paragraph(`${greeting(p.nome)} recebemos a confirmação do seu pagamento e já criamos a sua conta na Minha Causa Justa.`)}
    ${paragraph("Para acessar, defina a sua senha no botão abaixo:")}
    ${button(p.entrarUrl, "Entrar")}
    ${paragraph(`<span style="font-size:13px;color:${MUTED};">P.S.: logo após entrar, você poderá completar o seu perfil profissional para começar a ser encontrado por novos clientes.</span>`)}
  `;
  return {
    subject: "Minha Causa Justa: Conta Criada com Sucesso",
    html: layout(body),
  };
}

// 3. Pagamento confirmado, perfil ativo.
export function paymentConfirmedEmail(nome?: string | null): EmailContent {
  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:${PRIMARY};">Pagamento confirmado</h1>
    ${paragraph(`${greeting(nome)} o seu pagamento foi confirmado e a sua assinatura está ativa.`)}
    ${paragraph("Se o seu perfil já estiver completo, ele aparece no diretório público. Caso falte algo, complete agora para ser encontrado por novos clientes:")}
    ${button(`${APP_URL}/painel/perfil`, "Completar meu perfil")}
  `;
  return {
    subject: "Pagamento confirmado, seu perfil está no ar",
    html: layout(body),
  };
}

// 5. Remarketing: lead que começou o cadastro mas não concluiu.
export function remarketingEmail(p: {
  nome?: string | null;
  planoLabel?: string | null;
}): EmailContent {
  const plano = p.planoLabel?.trim();
  const linha = plano
    ? `Você começou seu cadastro e escolheu o ${escapeHtml(plano)}. Falta pouco para o seu perfil aparecer para quem está procurando um advogado agora.`
    : "Você começou seu cadastro na Minha Causa Justa. Falta pouco para o seu perfil aparecer para quem está procurando um advogado agora.";
  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:${PRIMARY};">Seu cadastro está quase pronto</h1>
    ${paragraph(`${greeting(p.nome)} ${linha}`)}
    ${paragraph("Retome de onde parou. Leva poucos minutos para concluir e ativar o seu perfil:")}
    ${button(`${APP_URL}/cadastro`, "Concluir meu cadastro")}
    ${paragraph(`<span style="font-size:13px;color:${MUTED};">Se você já concluiu, pode ignorar este e-mail.</span>`)}
  `;
  return {
    subject: "Falta pouco para concluir o seu cadastro",
    html: layout(body),
  };
}

// 4. Pagamento em atraso.
export function paymentOverdueEmail(p: {
  nome?: string | null;
  invoiceUrl?: string | null;
}): EmailContent {
  const cta = p.invoiceUrl
    ? button(p.invoiceUrl, "Regularizar agora")
    : button(`${APP_URL}/painel/assinatura`, "Regularizar agora");
  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:${ACCENT};">Sua assinatura está em atraso</h1>
    ${paragraph(`${greeting(p.nome)} identificamos um pagamento em atraso na sua assinatura.`)}
    ${paragraph("Para manter o seu perfil visível no diretório, regularize o pagamento:")}
    ${cta}
  `;
  return {
    subject: "Sua assinatura está com pagamento atrasado",
    html: layout(body),
  };
}
