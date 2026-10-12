---
name: Gate fail-open dependente de coluna nova
description: Por que um gate de qualidade que consulta uma coluna recém-criada fica silenciosamente desligado em produção após o deploy.
---

Quando um gate (canibalização, moderação, dedupe) passa a consultar uma coluna/extensão
criada por migração manual, o deploy do código **sem** rodar a migração deixa o gate
desligado sem nenhum sinal: o `catch` fail-open trata "coluna não existe" igual a
"tabela ainda não indexada" e devolve "não é duplicata". Pior: se o catch da Camada 1
retorna direto, as camadas seguintes nem chegam a rodar.

Rodar só a migração também não basta — a coluna nasce vazia, e comparar contra string
vazia dá similaridade 0, ou seja, o gate continua passando tudo.

**Why:** aconteceu na prod do blog: publicou-se o código que compara `entity_normalized`
antes de rodar `/migrate`; o relatório respondia 500 e o gerador diário rodou sem gate.

**How to apply:** para esse tipo de mudança o deploy tem 3 passos indivisíveis —
publicar → `migrate` → **reindexar/repopular** → conferir o endpoint de diagnóstico.
Se o endpoint de relatório responde 500 ou `totalIndexados: 0`, o gate está aberto.
Considere fazer o fail-open logar em nível de alerta em vez de silencioso.
