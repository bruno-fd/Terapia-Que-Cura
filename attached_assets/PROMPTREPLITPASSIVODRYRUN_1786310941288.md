# Passivo — dry-run (read-only) + diagnóstico do report

Aplica em cima do teto (0827365). Toca `corpus-index.ts` + `cron.ts`, read-only,
não altera dados. NÃO inclui o apply (301/despublicar) — isso espera sua aprovação
e a definição do mecanismo de redirect.

## Aplicar

```bash
git checkout claude/terapiaquecura-blog-strategy-g7og0e
git apply --check passivo-dryrun.patch && git am passivo-dryrun.patch
pnpm install && pnpm --filter @workspace/api-server run build
```
Não precisa migrate nem reindex (nada de schema, nada de stripMold).

## Novo endpoint dry-run

```bash
BASE=https://SEU-APP.replit.app ; TOKEN=$BLOG_CRON_TOKEN
curl -sS "$BASE/api/internal/blog/passivo-consolidacao" -H "Authorization: Bearer $TOKEN" | jq
```

Para cada par que o gate bloquearia, devolve, SEM escrever nada:
- `tipo`: "reformulacao" (título quase idêntico = mesmo post reescrito) |
  "mesma-entidade-intencao-distinta" (grupo B: sintomas x tem cura x tratamento) |
  "reformulacao-semantica" (mesma ideia, outras palavras).
- `acaoSugerida`: "301" | "consolidar-ou-manter" | "revisar".
- `manter` {postId, slug, title} e `despublicar` {…} — no grupo B `despublicar` é
  null (despublicar perderia texto útil; a ação é consolidar ou manter os dois).
- `criterio`: por que esse ficou (profundidade → mais antigo → capa → target_query).
- `simEntidade`, `simTitulo`, `simSemantica`: as três medidas, para você conferir.
- `resumo`: {total, reformulacao, grupoB, semantico}.

Esperado nos seus dados: ~8 "reformulacao"/"reformulacao-semantica" (candidatos a
301) e ~12 grupo B (empate 1.000 em entidade, intenção distinta → consolidar).

## Diagnóstico do report corrigido (sua observação)

Cada par do `/canibalizacao-report` agora traz `disparoLexical` e
`disparoSemantico`. Assim o par que aparece com `similaridade` lexical 0.575 mas
bloqueia via cosseno fica claro: `disparoLexical:false, disparoSemantico:true`.
(Sem mudança de lógica; só leitura.)

## O que falta decidir antes do APPLY (não construí de propósito)

1. Mecanismo de 301 — depende do host: o Static Deployment do Replit serve
   `/blog/*`, o Express só vê `/api/*`, então o 301 real NÃO sai do nosso Node.
   Opções: (a) regras de redirect do host estático (se existir no painel), (b)
   redirect client-side no SPA + canonical, (c) só despublicar + canonical.
   Me diga qual, que eu construo o apply de acordo.
2. Grupo B — o dry-run marca "consolidar-ou-manter" e NÃO despublica. O apply,
   quando vier, só vai mexer nos tipos de 301; o grupo B fica para consolidação
   editorial (fundir os dois textos num só) ou manter, decisão sua caso a caso.

Quando você rodar o dry-run e me mandar o JSON (ou só confirmar que os pares
batem), a gente trava o mecanismo de 301 e eu mando o apply — com o mesmo padrão:
dry-run por padrão, e a escrita (despublicar + registrar redirect) só num modo
explícito `?apply=1`, reversível (`published=false`, sem deletar).
