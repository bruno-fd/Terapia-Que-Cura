// ===========================================================================
// Despertador do blog (projeto separado, publicado como Scheduled Deployment).
//
// Ele NÃO sabe escrever posts. Só "toca a campainha" no app principal: chama o
// endpoint interno repetidamente, gerando 1 post por chamada, até não sobrar
// nenhuma categoria pendente do dia. Todas as regras de escrita continuam
// morando no app principal.
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

// Trava de segurança: são ~14 categorias, 30 chamadas é folga suficiente e
// impede loop infinito se algo der errado.
const MAX_CHAMADAS = 30;

for (let i = 1; i <= MAX_CHAMADAS; i++) {
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error(`Erro de rede na chamada ${i}:`, err.message);
    process.exit(1);
  }

  const texto = await resp.text();

  if (!resp.ok) {
    console.error(`Falha HTTP ${resp.status} na chamada ${i}: ${texto}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(texto);
  } catch {
    console.error(`Resposta inesperada na chamada ${i}: ${texto}`);
    process.exit(1);
  }

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
