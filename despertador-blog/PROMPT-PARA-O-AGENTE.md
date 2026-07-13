# Prompt para colar no agente do projeto NOVO (o despertador)

Copie TUDO abaixo da linha e cole no chat do Replit Agent de um projeto novo
(pode ser um Repl em branco). Depois, você só preenche os 2 secrets e publica.

---

Crie um projeto mínimo em Node.js que funcione como um "despertador" diário.
Ele NÃO gera conteúdo: a única função dele é, uma vez por dia, chamar um
endpoint de OUTRO app meu (já publicado) que gera os posts do blog, repetindo a
chamada até terminar. Todas as regras de escrita ficam no outro app.

1. Crie o arquivo `trigger.mjs` com exatamente este conteúdo:

```js
// Despertador do blog: chama o app principal repetidamente até não sobrar
// nenhuma categoria pendente do dia. Sem dependências (fetch nativo do Node 18+).
const url = process.env.BLOG_API_URL;
const token = process.env.BLOG_CRON_TOKEN;

if (!url || !token) {
  console.error("Faltam secrets: defina BLOG_API_URL e BLOG_CRON_TOKEN.");
  process.exit(1);
}

const MAX_CHAMADAS = 30; // trava de segurança (são ~14 categorias)

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
```

2. Este projeto precisa de 2 secrets (eu vou preencher os VALORES na aba
   Secrets — não coloque os valores no código):
   - `BLOG_API_URL` = `https://terapiaquecura.replit.app/api/internal/blog/generate-next`
   - `BLOG_CRON_TOKEN` = (o token do meu app principal; eu informo/colo)

3. Publique este projeto como **Scheduled Deployment** (deploy do tipo
   "Scheduled"), assim:
   - Build command: deixe vazio.
   - Run command: `node trigger.mjs`
   - Agendamento: todo dia às 07:00, timezone `America/Sao_Paulo`.
   - É um job que roda e encerra — não precisa abrir porta nem servir HTTP.

Confirme comigo o horário e me ajude a conferir os logs de um teste "Run Now".
