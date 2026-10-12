# Ajuste do teto de subtema + WARN de gate indisponível

Aplica EM CIMA do patch anterior (f2f8f8c). Toca só `corpus-index.ts`, +~60/−15.
Typecheck + build passam. Corrige os 2 falsos negativos que você mediu e torna o
fail-open visível. É a regra que VOCÊ testou no corpus real.

## Aplicar

```bash
git checkout claude/terapiaquecura-blog-strategy-g7og0e
git apply --check anticanib-teto.patch && git am anticanib-teto.patch
pnpm install && pnpm --filter @workspace/api-server run build
```

## O que muda (exatamente a sua proposta medida)

1. Guarda de subtema só ABAIXO de um teto de similaridade `BLOG_CANIB_SUBTEMA_TETO`
   (default 0.85). Subtema legítimo vive ~0.72-0.80; duplicata reformulada vive
   acima de 0.85. Recupera o bloqueio de "…desse ciclo" x "…do ciclo" (0.868).
2. Guarda numérica ISENTA do teto (Tipo 1 x Tipo 2 = 0.846 continua salvo).
3. Subtema NÃO se aplica na camada semântica: cos > 0.90 é mesmo conteúdo, então
   "Orientação de pais…" (0.928) volta a bloquear. Lá só a guarda numérica.
   (Funções separadas: `distintosLexical` com o teto, `distintosSemantico` só número.)
4. Complemento que você sugeriu: extras do subtema limitados a <=2 tokens (resíduo
   de frase não é subtema). Corta o caso (2) mesmo sem o teto.

Resultado medido por você: lexical 14→15 (Brigas volta), semântico 1→2 (Orientação
de pais volta), nenhum subtema legítimo volta a bloquear.

## Robustez que você pediu (fail-open silencioso)

O catch do gate era mudo. Um deploy sem /migrate deixou a Camada 1 lançando
(coluna inexistente) -> catch -> `naoDuplicado` + return, e a Camada 2 nem
rodava: um dia inteiro gerando sem checagem. Agora dispara um WARN ÚNICO por
processo ("Gate de canibalização indisponível ... rode /migrate. Operando
fail-open, SEM checagem") na primeira falha de consulta ao índice. Fica visível
no log sem poluir.

## Depois de publicar: reindex (por causa do (D) do patch anterior)

Este patch NÃO mexe no stripMold, mas o patch anterior (f2f8f8c) mexeu (limpeza
de conectivos), e a produção ainda tem `entity_normalized` da recalibração sem
essa limpeza. Então, ao publicar este lote, rode UMA vez:

```bash
BASE=https://SEU-APP.replit.app ; TOKEN=$BLOG_CRON_TOKEN
curl -sS -X POST "$BASE/api/internal/blog/reindex-corpus" -H "Authorization: Bearer $TOKEN"
curl -sS "$BASE/api/internal/blog/canibalizacao-report" -H "Authorization: Bearer $TOKEN" \
  | jq '{bloqueariaTotal, ex: [.pares[] | select(.bloquearia) | {sim: .similaridade, camada, a: .a.title, b: .b.title}] | .[0:20]}'
```

Espere: os pares "Brigas repetitivas…desse ciclo x do ciclo" e "Orientação de
pais…" com `bloquearia: true`; grupo C (catarata, TEPT no trabalho, bipolar geral
x tipo N) com `temasDistintos: true` / `bloquearia: false`.

## Sobre (B) consolidação — registro seu aceito

Concordo com sua ressalva: `marcarComoUsadas` consome até 5 irmãs do
`perguntasDoCluster` sem provar que o modelo cobriu cada uma no H2/FAQ. Aceito
como custo (fila de ~13,5k, ~6 consumidas/post = anos de material). Se um dia
quiser precisão, dá para casar cada irmã com os H2/FAQ realmente emitidos (parsear
o bodyHtml e só marcar as que viraram heading) antes de marcar. Deixo anotado; não
mudei agora.

## Fim da linha da recalibragem

Com isto o gate deve estar calibrado (falsos positivos e negativos resolvidos nos
dados reais). Quando você confirmar o report em produção, me dá o OK e eu construo
o endpoint do PASSIVO: por par, mantém o mais forte e faz 301 do mais fraco
(reversível, `published=false`, sem deletar).
