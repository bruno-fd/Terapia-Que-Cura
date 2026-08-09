# Recalibragem do gate de canibalização (compara ENTIDADE, não o título inteiro)

Delta em cima do seu HEAD atual (070ac4e). Fast-forward limpo. Toca 4 arquivos,
+245/−64. Typecheck + build passam. Corrige o falso positivo lexical sistêmico.

Anexos (use o que preferir):
- `anticanib-recalibra.patch` — aplica direto no seu HEAD.
- `anticanib-recalibra.bundle` — requer 070ac4e (= seu HEAD), então dá ff-merge.

## O que mudou (a raiz do problema)

A Camada 1 comparava o TÍTULO inteiro; o molde repetido dominava o trigrama e
temas distintos colidiam. Agora ela compara a ENTIDADE (o título com o molde
removido):
- Nova coluna aditiva `blog_post_index.entity_normalized` = `stripMold(título)`.
  "Alcoolismo tem cura? O que esperar do tratamento" → entidade "alcoolismo";
  "Bulimia ..." → "bulimia" → similaridade ~0, não bloqueia.
- Duplicados reais sobem: "Estresse pós-traumático: sintomas e o que fazer" x
  "...: o que é e o que fazer" → ambos entidade "estresse pos traumatico" → ~1.0.
- Guarda de variante numérica: entidades iguais a menos de um número (Bipolar
  Tipo 1 x Tipo 2, TEA nível 1 x 2) são temas DISTINTOS e nunca bloqueiam, nas
  duas camadas.
- Limiares agora por env (calibráveis em produção sem redeploy):
  `BLOG_CANIB_LEX` (default 0.72), `BLOG_CANIB_SEM` (default 0.90, subiu de 0.85).

## Aplicar

```bash
git checkout claude/terapiaquecura-blog-strategy-g7og0e
git apply --check anticanib-recalibra.patch && git am anticanib-recalibra.patch
# (ou: git fetch anticanib-recalibra.bundle HEAD:tmp && git merge --ff-only tmp)
pnpm install && pnpm --filter @workspace/api-server run build
```

## OBRIGATÓRIO depois de publicar: re-migrar e re-indexar

A coluna `entity_normalized` precisa existir e ser preenchida, senão a Camada 1
compara contra vazio (fail-open: não bloqueia nada, seguro mas inútil).

```bash
BASE=https://SEU-APP.replit.app ; TOKEN=$BLOG_CRON_TOKEN
curl -sS -X POST "$BASE/api/internal/blog/migrate"        -H "Authorization: Bearer $TOKEN"   # add coluna + índice
curl -sS -X POST "$BASE/api/internal/blog/reindex-corpus"  -H "Authorization: Bearer $TOKEN"   # popula entity_normalized
```

## Validar a precisão ANTES de confiar (o report agora te diz)

```bash
curl -sS "$BASE/api/internal/blog/canibalizacao-report" -H "Authorization: Bearer $TOKEN" | jq '{bloqueariaTotal, totalIndexados, amostra: [.pares[] | select(.bloquearia)] | .[0:20]}'
```

Cada par agora traz `bloquearia` (o gate barraria?) e `numeroDistinto`. O que
esperar da recalibragem:
- Os falsos positivos de molde (Alcoolismo×Bulimia, Identidade de gênero×
  Orientação de pais, Bipolar×Bulimia "sintomas") → `bloquearia: false`.
- Bipolar Tipo 1×Tipo 2 → `numeroDistinto: true`, `bloquearia: false`.
- Os duplicados de verdade (Não monogamia/poliamor, Ciúme excessivo, Coração
  acelerado, Estresse pós-traumático, Avaliação p/ cirurgia, e os semânticos
  0.89-0.90 de mesma entidade) → `bloquearia: true`.

Se algum caso ficar do lado errado, ajuste sem redeploy de lógica: suba/baixe
`BLOG_CANIB_LEX` / `BLOG_CANIB_SEM` nos secrets e rode o report de novo (ele lê
os limiares atuais). Quando `bloqueariaTotal` refletir só duplicados reais, o
gate está calibrado e o robô pode voltar a publicar sem risco de auto-rejeição.

## Depois disso

Sobra o PASSIVO (os pares reais já publicados). Quando você validar o report,
me dá o OK que eu construo o endpoint de consolidação: por par, mantém o mais
forte e faz 301 do mais fraco (reversível, `published=false`, sem deletar).
