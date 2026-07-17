// ===========================================================================
// Despertador do blog (projeto separado, publicado como Scheduled Deployment).
//
// Ele NÃO sabe escrever posts. Só "toca a campainha" no app principal: chama o
// endpoint interno repetidamente, gerando 1 post por chamada, até não sobrar
// nenhuma categoria pendente do dia. Todas as regras de escrita continuam
// morando no app principal.
//
// Resistente a falhas transitórias: uma queda de conexão ou um erro 5xx NÃO
// derruba o lote inteiro — ele espera e tenta de novo (o endpoint é
// idempotente, então repetir é seguro e barato). Só desiste depois de várias
// falhas seguidas, ou imediatamente se o token estiver errado (401/403).
//
// Sem dependências (usa fetch nativo do Node 18+). Comando de execução do
// Scheduled Deployment: `node trigger.mjs`.
//
// Secrets necessários NESTE projeto (aba Secrets):
//   BLOG_API_URL    -> https://SEU-APP.replit.app/api/internal/blog/generate-next
//   BLOG_CRON_TOKEN -> o MESMO valor configurado no app principal
// ===========================================================================

const url = process.env.BLOG_API_URL;
const token = process.env.BLOG_CRON_TOKEN;

if (!url || !token) {
  console.error(
    "Faltam secrets: defina BLOG_API_URL e BLOG_CRON_TOKEN neste projeto.",
  );
  process.exit(1);
}

// Trava de segurança: são ~14 categorias, 40 tentativas é folga suficiente e
// impede loop infinito se algo der errado.
const MAX_CHAMADAS = 40;
// Cada geração leva ~40–50s; 3 min de limite por chamada é folga.
const TIMEOUT_POR_CHAMADA_MS = 180_000;
// Quantas falhas SEGUIDAS toleramos antes de desistir do lote.
const MAX_FALHAS_SEGUIDAS = 4;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let falhasSeguidas = 0;

for (let i = 1; i <= MAX_CHAMADAS; i++) {
  let resp;
  let texto;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_POR_CHAMADA_MS),
    });
    texto = await resp.text();
  } catch (err) {
    falhasSeguidas += 1;
    console.error(
      `Erro de rede na chamada ${i} (falha ${falhasSeguidas}/${MAX_FALHAS_SEGUIDAS}):`,
      err.message,
    );
    if (falhasSeguidas >= MAX_FALHAS_SEGUIDAS) {
      console.error("Muitas falhas seguidas; encerrando.");
      process.exit(1);
    }
    await dormir(15_000 * falhasSeguidas); // espera crescente antes de repetir
    continue;
  }

  // Token errado não melhora repetindo: para na hora, com mensagem clara.
  if (resp.status === 401 || resp.status === 403) {
    console.error(`Token recusado (HTTP ${resp.status}): ${texto}`);
    process.exit(1);
  }

  if (!resp.ok) {
    falhasSeguidas += 1;
    console.error(
      `Falha HTTP ${resp.status} na chamada ${i} (falha ${falhasSeguidas}/${MAX_FALHAS_SEGUIDAS}): ${texto}`,
    );
    if (falhasSeguidas >= MAX_FALHAS_SEGUIDAS) {
      console.error("Muitas falhas seguidas; encerrando.");
      process.exit(1);
    }
    await dormir(15_000 * falhasSeguidas);
    continue;
  }

  let data;
  try {
    data = JSON.parse(texto);
  } catch {
    falhasSeguidas += 1;
    console.error(`Resposta inesperada na chamada ${i}: ${texto}`);
    if (falhasSeguidas >= MAX_FALHAS_SEGUIDAS) {
      console.error("Muitas falhas seguidas; encerrando.");
      process.exit(1);
    }
    await dormir(15_000 * falhasSeguidas);
    continue;
  }

  falhasSeguidas = 0; // sucesso zera o contador

  console.log(
    `chamada ${i}: processado=${data.processed ?? "-"} ` +
      `status=${data.status ?? "-"} faltam=${data.remaining}`,
  );

  if (data.remaining <= 0) {
    console.log("Lote diário concluído com sucesso.");
    process.exit(0);
  }
}

console.log("Limite de chamadas atingido; encerrando por segurança.");
