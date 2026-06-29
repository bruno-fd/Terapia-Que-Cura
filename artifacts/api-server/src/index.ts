import app from "./app";
import { logger } from "./lib/logger";
import { registerAsaasWebhook } from "./lib/registerAsaasWebhook";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Registro idempotente do webhook Asaas, para que um pagamento confirmado
  // ative a assinatura sem configuração manual. Não bloqueia a inicialização.
  void registerAsaasWebhook();
});
