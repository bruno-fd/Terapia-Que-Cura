---
name: Publish travado por drift de schema com extensões Postgres
description: Como destravar o fluxo de publish do Replit quando o dev tem objetos que a produção não consegue criar, sem sobrescrever os dados de produção.
---

O passo de banco do fluxo de publish do Replit só oferece duas saídas: copiar o
banco de **desenvolvimento** para a produção, ou cancelar. A opção de copiar
**sobrescreve os dados existentes em produção** (confirmado na documentação) —
nunca use em projeto cujo banco de produção é o real.

Ele copia objetos do banco de dev (não só o schema Drizzle: pega índices criados
à mão), e falha quando a produção não tem a extensão correspondente — ex.:
`CREATE INDEX ... USING gin (... gin_trgm_ops)` com `pg_trgm` ausente em prod.

**Saída correta:** zerar o drift pelo lado do dev. Dropar do banco de dev os
objetos derivados que a prod não tem, publicar (sem drift, o passo não bloqueia),
e então criar as extensões/tabelas/índices em produção por SQL idempotente rodado
**de dentro do app publicado** (endpoint interno com token). Depois recriar os
mesmos objetos no dev, para os dois ambientes ficarem iguais e o próximo publish
não repetir o conflito.

**Why:** o papel do banco que o app publicado usa **tem** permissão de
`CREATE EXTENSION`; o acesso do agente à produção é somente leitura e não
consegue. Por isso a migração precisa nascer dentro do app, não das ferramentas
do agente.

**How to apply:** antes de pedir publish, compare `information_schema.columns` e
`pg_indexes` entre dev e produção. Se a única diferença for dado derivado
(índices, tabelas de cache), dropar no dev é seguro e reversível.
