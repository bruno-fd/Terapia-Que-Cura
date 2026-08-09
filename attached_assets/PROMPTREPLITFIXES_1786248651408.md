# Correções da revisão — anti-canibalização (2 fixes + ordem dos embeddings)

Delta em cima do anti-canibalização já aplicado. Toca só 2 arquivos
(`embeddings.ts`, `daily-generator.ts`), +61/−22. Typecheck + build passam.

Enviei DOIS formatos; use o que for mais fácil:
- `anticanib-fixes.patch` — RECOMENDADO. Aplica direto no seu HEAD atual
  (cece158), independente do hash.
- `anticanib-fixes.bundle` — alternativa (requer o commit c081c0e, que está no
  histórico do cece158 porque você fez ff-merge dele).

## Aplicar via patch (recomendado)

```bash
git checkout claude/terapiaquecura-blog-strategy-g7og0e
git apply --check anticanib-fixes.patch   # confere que aplica limpo
git am anticanib-fixes.patch              # aplica preservando a mensagem de commit
# (se preferir sem criar commit: git apply anticanib-fixes.patch)
pnpm install && pnpm --filter @workspace/api-server run build
```

## Ou via bundle

```bash
git fetch anticanib-fixes.bundle HEAD:anticanib-fixes
git cherry-pick anticanib-fixes   # traz o commit do fix para a sua branch
```

## O que mudou (as 3 questões que você levantou)

1. PROBLEMA 1 — fluxo de fallback publicava sem anti-canibalização. Agora o
   `processarCategoria` clássico (o fallback quando a fila esvazia, e o caminho
   que gerou os 207 posts) roda o Checkpoint 2 (`verificarCanibalizacao`, Camada
   1 lexical + Camada 2 semântica) imediatamente antes do `persistGeneratedPost`,
   com o mesmo tratamento (status `rejected` + reason). Fail-open mantido.

2. PROBLEMA 2 — fetch de embeddings sem timeout. Agora cada tentativa usa
   `AbortSignal.timeout(15s)`; ao expirar, o erro cai no retry/backoff que já
   existia e degrada rápido para a camada lexical (em vez de segurar o advisory
   lock por ~5 min). Pior caso ~48s (3 × 15s) em vez de ~15 min.

3. EMBEDDINGS — ordem invertida. Como você confirmou que o proxy do Replit NÃO
   roteia embeddings, o `resolverProvider()` agora tenta PRIMEIRO a chave própria
   (`BLOG_EMBEDDING_PROVIDER=voyage` ou `BLOG_EMBEDDING_API_KEY`) e só cai no
   proxy do Replit como último recurso, com um WARN único no log. Como você já
   configurou `BLOG_EMBEDDING_API_KEY`, ele passa a ser o caminho primário e não
   há mais tentativa que falha antes da que funciona.

## Depois de aplicar

Nada muda na sequência que você já planejou. Quando publicar:
`migrate` → `reindex-corpus` → `canibalizacao-report`, e me manda o report dos
pares que eu te ajudo a decidir o passivo (despublicar o mais fraco + 301, se
você quiser que eu construa esse endpoint).
