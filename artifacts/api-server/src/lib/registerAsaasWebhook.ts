import { logger } from "./logger";
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  getMyAccount,
  isAsaasConfigured,
  AsaasError,
  type AsaasWebhook,
} from "./asaas";

// Eventos que o handler em routes/subscription.ts sabe tratar. Mantê-los em
// sincronia garante que toda transição relevante chegue ao servidor.
const WEBHOOK_EVENTS = [
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
];

const WEBHOOK_NAME = "Minha Causa Justa, assinaturas";
const WEBHOOK_PATH = "/api/assinatura/webhook";

// URL pública por onde a Asaas alcança este servidor. Em produção, o primeiro
// domínio de REPLIT_DOMAINS; em dev, o domínio de desenvolvimento.
function publicBaseUrl(): string | null {
  const first = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  const domain = first || process.env["REPLIT_DEV_DOMAIN"];
  if (!domain) return null;
  return domain.startsWith("http") ? domain : `https://${domain}`;
}

function eventsMatch(current: string[], desired: string[]): boolean {
  if (current.length !== desired.length) return false;
  const set = new Set(current);
  return desired.every((e) => set.has(e));
}

// Destino das notificações de falha do webhook: ASAAS_WEBHOOK_EMAIL, com
// fallback para o e-mail da conta Asaas. Sem isso a Asaas rejeita a criação.
async function resolveEmail(): Promise<string | undefined> {
  const fromEnv = process.env["ASAAS_WEBHOOK_EMAIL"];
  if (fromEnv) return fromEnv;
  try {
    const account = await getMyAccount();
    return account.email ?? undefined;
  } catch (err) {
    logger.warn({ err }, "Não foi possível obter o e-mail da conta Asaas.");
    return undefined;
  }
}

// Registra (ou atualiza) o webhook da Asaas de forma idempotente, identificando
// o registro existente pela URL. Falhas são logadas, nunca derrubam o servidor.
export async function registerAsaasWebhook(): Promise<void> {
  if (!isAsaasConfigured()) {
    logger.info(
      "Chave Asaas ausente para o ambiente atual; registro do webhook ignorado.",
    );
    return;
  }

  const base = publicBaseUrl();
  if (!base) {
    logger.warn(
      "Domínio público indisponível; webhook Asaas não foi registrado.",
    );
    return;
  }

  const url = `${base}${WEBHOOK_PATH}`;
  const authToken = process.env["ASAAS_WEBHOOK_TOKEN"] || undefined;

  const desired: AsaasWebhook = {
    name: WEBHOOK_NAME,
    url,
    enabled: true,
    interrupted: false,
    apiVersion: 3,
    sendType: "SEQUENTIALLY",
    events: WEBHOOK_EVENTS,
    ...(authToken ? { authToken } : {}),
  };

  try {
    const existing = await listWebhooks();
    const match = existing.find((w) => w.url === url);

    if (!match) {
      const email = await resolveEmail();
      await createWebhook({ ...desired, ...(email ? { email } : {}) });
      logger.info({ url }, "Webhook Asaas registrado.");
      return;
    }

    // Re-sincroniza o token sempre que ele estiver configurado mas o registro
    // não apresentar um valor (a listagem costuma omitir o authToken, então
    // isso pode disparar um update por startup, que é idempotente e barato) ou
    // quando a Asaas devolver um valor divergente. Isso evita que um webhook
    // criado antes do token ficar permanentemente sem autenticação.
    const tokenNeedsSync = Boolean(
      authToken && (!match.authToken || match.authToken !== authToken),
    );
    const needsUpdate =
      !match.enabled ||
      match.interrupted ||
      !eventsMatch(match.events ?? [], WEBHOOK_EVENTS) ||
      tokenNeedsSync;

    if (needsUpdate && match.id) {
      await updateWebhook(match.id, desired);
      logger.info({ url }, "Webhook Asaas atualizado.");
    } else {
      logger.info({ url }, "Webhook Asaas já está configurado.");
    }
  } catch (err) {
    if (err instanceof AsaasError) {
      logger.error(
        { status: err.status, message: err.message },
        "Falha ao registrar o webhook Asaas.",
      );
    } else {
      logger.error({ err }, "Erro inesperado ao registrar o webhook Asaas.");
    }
  }
}
