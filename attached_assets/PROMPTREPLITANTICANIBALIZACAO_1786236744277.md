# Prompt para o agente do Replit — Anti-canibalização do blog (aditivo)

Cole TUDO abaixo da linha no chat do Replit Agent do projeto principal.
Anexo: `blog-anticanibalizacao.bundle` (delta rebaseado no HEAD da branch de
produção `claude/terapiaquecura-blog-strategy-g7og0e`; +949/−5 linhas, 1 commit).

Este delta é ADITIVO e reutiliza o que já existe (fila `blog_keyword_queue`,
geração ancorada, endpoint `mine-next`, scripts). NÃO cria arquivos paralelos e
NÃO altera a tabela `blog_keyword_queue` (que já está populada em produção).

---

Aplique um upgrade ADITIVO de anti-canibalização no blog. O código está pronto
(typecheck + build passam) no arquivo `blog-anticanibalizacao.bundle`. NÃO
reimplemente nada; apenas aplique, migre o schema pelos ENDPOINTS internos (não
use `drizzle-kit push`) e configure os embeddings.

## 1. Aplicar o código

Faça upload de `blog-anticanibalizacao.bundle` para a raiz do projeto e rode:

```bash
git bundle verify blog-anticanibalizacao.bundle
git fetch blog-anticanibalizacao.bundle claude/blog-anticanibalizacao:claude/blog-anticanibalizacao
# Integre na branch de produção (é um fast-forward de 1 commit em cima do HEAD):
git checkout claude/terapiaquecura-blog-strategy-g7og0e
git merge --ff-only claude/blog-anticanibalizacao
pnpm install
```

Depois faça o deploy normal (o único processo Node é o Express da API).

## 2. Embeddings (RESPOSTA à sua pergunta: use o proxy do Replit, sem chave paga)

O provider (`lib/embeddings.ts`) detecta automaticamente, nesta ordem:
1. Proxy OpenAI do Replit: `AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY`
   (mesmo padrão da integração Anthropic que você já usa). Modelo
   `text-embedding-3-small`, 1024 dims. É o caminho recomendado: **não precisa
   contratar chave**. Basta habilitar a AI Integration "OpenAI" no Replit para
   que essas duas env vars existam no deploy.
2. Fallback: `BLOG_EMBEDDING_API_KEY` (+ opcional `BLOG_EMBEDDING_BASE_URL`), ou
   `BLOG_EMBEDDING_PROVIDER=voyage` com a chave.

Caveat honesto: se o proxy do Replit NÃO expuser a rota `/v1/embeddings`
(alguns proxies só roteiam chat), o provider vai falhar e cair no modo
fail-open (só a Camada 1 lexical roda). Teste com o passo 4; se o report
semântico vier vazio e o log acusar erro de embeddings, aí sim configure
`BLOG_EMBEDDING_API_KEY`. IMPORTANTE: mesmo SEM embeddings, a Camada 1 lexical
(pg_trgm) já resolve o pior do seu problema, os títulos quase-gêmeos ("... tem
cura?", "sintomas", os 19 pares), porque são similares no título. A camada
semântica pega a canibalização de TEMA mais profunda (H2 clonados, subcategorias
marteladas).

## 3. Migração pelo ENDPOINT (não use db:push)

`drizzle-kit push` não roda aí (prompt interativo por drift + sem TTY) e o banco
de produção é só-leitura para as ferramentas externas. Por isso a migração é SQL
idempotente exposto como endpoint interno, chamado por HTTP de fora (mesmo padrão
que populou a fila). Cria as extensões `vector` + `pg_trgm`, a tabela
`blog_post_index` e os índices GIN(trgm) + HNSW.

```bash
BASE=https://SEU-APP.replit.app
TOKEN=$BLOG_CRON_TOKEN   # o mesmo secret já usado nos outros endpoints internos

# 1) cria extensões + tabela + índices (idempotente; devolve os passos)
curl -sS -X POST "$BASE/api/internal/blog/migrate" -H "Authorization: Bearer $TOKEN"

# 2) indexa os 207 posts publicados no corpus (OBRIGATÓRIO para os checkpoints
#    enxergarem o que já está no ar). Roda de dentro da produção.
curl -sS -X POST "$BASE/api/internal/blog/reindex-corpus" -H "Authorization: Bearer $TOKEN"
```

## 4. Diagnóstico do passivo (READ-ONLY) e report semântico

```bash
# Lista os pares de posts publicados que se canibalizam (lexical + semântico).
# NÃO altera nada. Use para decidir o que fazer com os 19 pares.
curl -sS "$BASE/api/internal/blog/canibalizacao-report" -H "Authorization: Bearer $TOKEN" | jq
```

Se o array de pares "semantica" vier vazio mas os "lexical" aparecerem, os
embeddings não estão ativos (ver passo 2, caveat).

## 5. O que passa a acontecer sozinho (nada mais a configurar)

Com `BLOG_USE_KEYWORD_QUEUE=1` já ligado, o gerador diário agora, além do que já
fazia:
- Checkpoint 1 (ao enfileirar e ao escolher o alvo): pula buscas já cobertas por
  um post existente (similaridade de título pg_trgm), não só título idêntico.
- Checkpoint 2 (antes de publicar): descarta o rascunho se ele estiver perto
  demais (lexical > 0,55 OU cosseno > 0,85) de um post que já existe, marcando a
  query como `skipped` para consolidação humana, em vez de publicar um gêmeo.
- Citação cruzada: cita de 2 a 3 posts internos relacionados no meio do texto,
  com allowlist de slugs (link interno nunca quebra).

Tudo é FAIL-OPEN: sem a tabela/extensão ou sem embeddings, degrada (lexical ou
no-op) e nunca bloqueia a geração.

## Decisão que ficou para você (passivo dos 19 pares)

Eu entreguei só o DIAGNÓSTICO read-only (passo 4). NÃO despubliquei nem redirecionei
nada, porque isso mexe em produção/SEO e é decisão sua. Depois de olhar o report,
me diga se quer que eu construa o endpoint que, por par, mantém o post mais forte
e faz 301 do mais fraco (reversível, `published=false`, sem deletar).

## Restrições respeitadas

- Aditivo sobre a branch de produção; `blog_keyword_queue` intacta.
- Sem `drizzle-kit push`: schema por SQL idempotente via endpoint.
- Escrita em prod só por endpoint protegido por `BLOG_CRON_TOKEN`.
- Reutiliza fila, endpoints e scripts existentes (nada de paralelos).
