# Despertador do blog (Scheduled Deployment)

Este é o "despertador" da **Opção 3**: um projeto **separado**, minúsculo, cuja
única função é acordar 1x por dia e pedir ao app principal que gere os posts do
dia. **Nenhuma regra de escrita vive aqui** — tudo continua no app principal
(`Minha Causa Justa`). Este projeto só chama um endereço.

## Como funciona

O app principal expõe um endpoint protegido:

```
POST /api/internal/blog/generate-next
Authorization: Bearer <BLOG_CRON_TOKEN>
```

Cada chamada gera **um** post pendente do dia e responde quantas categorias
ainda faltam (`{ "processed": "...", "status": "...", "remaining": N }`). O
`trigger.mjs` chama esse endereço em sequência até `remaining` chegar a `0`.

É **idempotente e barato**: depois que todas as categorias já rodaram no dia, o
endpoint responde `remaining: 0` sem gastar IA. Ou seja, mesmo que o despertador
toque à toa, o custo máximo é um lote por dia.

## Passo a passo para colocar no ar

Pré-requisito: o **app principal já publicado** (Autoscale) e com o secret
`BLOG_CRON_TOKEN` configurado. Anote a URL de produção dele
(ex.: `https://minha-causa-justa.SEU-USUARIO.replit.app`).

1. **Crie um Repl novo** (template Node.js, em branco).
2. **Copie o arquivo `trigger.mjs`** deste diretório para o novo Repl.
3. **Configure os Secrets** do novo Repl (aba Secrets 🔒):
   - `BLOG_API_URL` = `https://SEU-APP.replit.app/api/internal/blog/generate-next`
     (a URL de produção do app principal + o caminho do endpoint)
   - `BLOG_CRON_TOKEN` = **o mesmo valor** que está no app principal
4. **Publique como Scheduled Deployment** (botão Publish → tipo **Scheduled**):
   - **Build command:** deixe vazio (não precisa)
   - **Run command:** `node trigger.mjs`
   - **Schedule:** escreva algo como "todo dia às 7h" (a IA converte em cron)
   - **Timezone:** `America/Sao_Paulo`
5. **Teste na hora:** aba **Schedule** → botão **Run Now**. Acompanhe os logs;
   você deve ver linhas como `chamada 1: processado=... faltam=13` até
   `Lote diário concluído com sucesso.`

## Observações

- Node 18+ (o `fetch` é nativo). Qualquer Repl Node recente serve.
- Se o token estiver errado, o log mostra `Falha HTTP 401`. Se o endpoint não
  estiver configurado no app, mostra `Falha HTTP 503`.
- Para mudar o horário, é só editar o Schedule — não precisa mexer em código.
