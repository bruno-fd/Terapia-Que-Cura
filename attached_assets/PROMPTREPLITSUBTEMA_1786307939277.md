# Ajuste fino do gate: subtema (C), limpeza do stripMold (D), consolidação (B)

Aplica EM CIMA da recalibração que você já aplicou (4218f37). Toca 4 arquivos,
+110/−17. Typecheck + build passam. Endereça os grupos C e D e resolve o B de
forma explícita. É um patch (o bundle não serve porque seu HEAD 4218f37 ainda
não está no GitHub que eu enxergo).

## Aplicar

```bash
git checkout claude/terapiaquecura-blog-strategy-g7og0e
git apply --check anticanib-subtema.patch && git am anticanib-subtema.patch
pnpm install && pnpm --filter @workspace/api-server run build
```

## O que muda

(C) GUARDA DE SUBTEMA — resolve os ~7 falsos positivos do grupo C. Além da
    variante numérica, agora quando uma entidade é subconjunto estrito da outra
    com um qualificador SIGNIFICATIVO, são temas distintos e não bloqueiam:
    "estresse pós-traumático" x "…no trabalho", "avaliação psicológica para
    cirurgia" x "…de catarata", "transtorno bipolar" (geral) x "…tipo 1".
    CUIDADO embutido: um extra que é só FILLER ("…sem motivo" x "…sem motivo
    aparente") NÃO conta como subtema, então o duplicado real do grupo A
    continua bloqueando. (`saoTemasDistintos` = número OU subtema.)

(D) LIMPEZA DO stripMold — remove conectivos soltos deixados ao tirar o molde:
    "de ansiedade generalizada" → "ansiedade generalizada", "burnout e para
    melhorar" → "burnout melhorar", "google X" → "X"; preserva o conectivo único
    entre palavras de conteúdo ("não monogamia e poliamor"). Cosmético, mas
    deixa a entidade limpa.

(B) CONSOLIDAÇÃO (decisão explícita = um post denso por tema, alinhado ao gate).
    Quando um post de cluster é publicado, as perguntas-irmãs que entraram nele
    como H2/FAQ passam a `used` também (não voltam como alvos separados que o
    gate reprovaria depois). Isso alinha a fila com o gate e é o que o desenho
    original já previa ("marcar o cluster inteiro como usado").
    Se você preferir a estratégia oposta (cobrir intenções distintas do mesmo
    tema como posts separados: "bulimia sintomas" e "bulimia tem cura" viram 2
    posts), me avisa: aí eu removo a consolidação e torno o gate ciente de
    intenção, em vez de comparar só a entidade. Hoje o default é consolidar.

## OBRIGATÓRIO depois de aplicar: reindexar (o stripMold mudou)

A coluna `entity_normalized` é recalculada pelo novo stripMold, então precisa ser
repopulada, senão o gate compara entidades no formato antigo.

```bash
BASE=https://SEU-APP.replit.app ; TOKEN=$BLOG_CRON_TOKEN
curl -sS -X POST "$BASE/api/internal/blog/reindex-corpus" -H "Authorization: Bearer $TOKEN"
curl -sS "$BASE/api/internal/blog/canibalizacao-report" -H "Authorization: Bearer $TOKEN" \
  | jq '{bloqueariaTotal, totalIndexados, ainda: [.pares[] | select(.bloquearia)] | length}'
```

Esperado vs. a medição anterior (24 pares bloqueariam):
- Grupo C (subtema) sai do bloqueio: avaliação p/ cirurgia x catarata, TEPT x no
  trabalho, bipolar geral x tipo 1 → agora `temasDistintos: true`, `bloquearia:
  false`. `bloqueariaTotal` deve cair de 24 para a faixa dos ~15-18.
- Grupo A (duplicatas reais, incl. "coração acelerado sem motivo aparente")
  continua `bloquearia: true`.
- Grupo B (mesma entidade, intenção diferente) continua bloqueando NO GATE, mas
  passa a ser raro na prática porque as irmãs são consumidas na geração.

Obs.: o campo do report `numeroDistinto` virou `temasDistintos` (agora cobre
número + subtema).

## Depois disso

Fica só o PASSIVO (os pares reais já publicados). Quando você fechar a
calibragem, me dá o OK que eu construo o endpoint de consolidação: por par,
mantém o mais forte e faz 301 do mais fraco (reversível, `published=false`).
