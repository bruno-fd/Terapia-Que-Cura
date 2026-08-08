# Prompt para o agente do Replit — Upgrade do blog (mineração + anti-canibalização)

Cole TUDO abaixo da linha no chat do Replit Agent do projeto principal
(`Terapia Que Cura`). O código já está pronto num git bundle; você só aplica,
migra o banco e configura 2 secrets.

Anexos que acompanham este prompt:
- `blog-mineracao.bundle` — o código (uma branch com 2 commits em cima do `main`).

---

Preciso aplicar um upgrade no mecanismo do blog que já está pronto e testado
(typecheck e build passam). O código vem no arquivo `blog-mineracao.bundle` que
enviei para o projeto. NÃO reescreva nada: apenas aplique o bundle, rode a
migração do banco na ordem certa e configure os secrets.

## 1. Aplicar o código

Faça upload do arquivo `blog-mineracao.bundle` para a raiz do projeto (se ainda
não estiver lá) e rode no Shell:

```bash
# Confere que o bundle bate com o main atual do projeto
git bundle verify blog-mineracao.bundle

# Traz a branch do bundle para o repositório local
git fetch blog-mineracao.bundle claude/project-execution-7u10ix:claude/project-execution-7u10ix

# Entra na branch (ou faça o merge dela no main, se preferir integrar direto)
git checkout claude/project-execution-7u10ix
```

Alternativa: se este Replit estiver conectado ao GitHub `bruno-fd/Terapia-Que-Cura`,
a mesma branch já está lá; você pode `git fetch origin claude/project-execution-7u10ix`
em vez de usar o bundle. Use o que for mais fácil.

Depois instale as dependências (há tabelas e libs novas):

```bash
pnpm install
```

## 2. Configurar os secrets (aba Secrets 🔒)

Novos (habilitam o filtro semântico, a anti-canibalização semântica e a citação
cruzada por links internos):

- `BLOG_EMBEDDING_PROVIDER` = `openai`  (ou `voyage`)
- `BLOG_EMBEDDING_API_KEY`  = a chave do provider escolhido
- `BLOG_EMBEDDING_MODEL`    = (opcional) override do modelo. Default: `text-embedding-3-small` (openai) / `voyage-3.5` (voyage). Sempre 1024 dimensões.

Confirme que estes já existem (usados pelo blog):
- `DATABASE_URL` (Postgres) · `AI_INTEGRATIONS_ANTHROPIC_*` (geração) · `PEXELS_API_KEY` (capa, opcional) · `BLOG_CRON_TOKEN` (protege os endpoints internos).

Observação: os embeddings são OPCIONAIS. Sem eles, o mecanismo degrada para
apenas lexical (não quebra), mas perde o filtro semântico, a Camada 2 de
anti-canibalização e a citação cruzada. Configure a chave para ter tudo.

## 3. Migração do banco (a ORDEM importa)

O `db:push` do Drizzle NÃO cria as extensões nem os índices especiais (trgm/HNSW).
Rode exatamente nesta ordem (tudo idempotente, pode repetir sem medo):

```bash
# 1) cria as extensões pgvector + pg_trgm (precisa vir ANTES do push)
pnpm --filter @workspace/api-server run blog-migrate

# 2) cria as tabelas novas (blog_keyword_queue, blog_post_index) + colunas
#    (blog_posts.target_query, blog_post_index.embedding vector(1024))
pnpm --filter @workspace/db run push

# 3) cria os índices GIN(trgm) e HNSW em blog_post_index
pnpm --filter @workspace/api-server run blog-migrate

# 4) indexa os posts já publicados no corpus (anti-canibalização + citação cruzada)
pnpm --filter @workspace/api-server run index-corpus
```

Se o `db:push` fizer perguntas interativas, aceite as adições (são aditivas: 2
tabelas novas + 2 colunas novas, nada é removido).

## 4. Calibrar antes de soltar

```bash
# Minera 1 eixo e imprime as top buscas (confira "a olho" a qualidade)
pnpm --filter @workspace/api-server run mine-keywords "Ansiedade e Estresse"

# Gera + revisa o próximo cluster da fila e imprime SEM salvar (calibra tom)
pnpm --filter @workspace/api-server run preview-post "Ansiedade e Estresse"
```

Se as buscas mineradas ou o tom estiverem bons, popule a fila para valer
(sem argumento = todos os 14 eixos; leva alguns minutos):

```bash
pnpm --filter @workspace/api-server run mine-keywords
```

## 5. Geração automática (já integrada, nada muda no despertador)

O gerador diário que você já tem (`generate-daily-posts` / o despertador
agendado que bate em `POST /api/internal/blog/generate-next`) passa a puxar
automaticamente o cluster mais forte da fila para cada macrocategoria. Se a fila
estiver vazia para uma macro, ele cai no comportamento antigo (a IA inventa o
tema), então nada quebra se você ainda não minerou tudo.

Há também endpoints internos novos (protegidos pelo `BLOG_CRON_TOKEN`), úteis
para agendar depois:
- `POST /api/internal/blog/mine` com body `{ "macro": "Ansiedade e Estresse" }` — minera 1 macro e enfileira.
- `POST /api/internal/blog/reindex-corpus` — reconstrói o índice do corpus.

## Decisões de produto (NÃO mudar sem confirmar comigo)

- O blog automático PUBLICA direto, sem rascunho. Um post que a anti-canibalização
  reprovar é DESCARTADO (status `rejected`), nunca vira rascunho.
- Os posts NÃO têm assinatura de autor. Não existe coluna de autor e nada é
  renderizado além de data + tempo de leitura. Não conecte nome de autor.
- As regras de escrita (Código de Ética do CFP, orientação do CVV/188 em temas
  de risco, revisor independente que reprova na dúvida) continuam exatamente as
  mesmas. Não há citação acadêmica por DOI (não combina com o público leigo).

## O que este upgrade acrescenta (resumo)

- Mineração de demanda real (Google Autocomplete pt+en) → fila pontuada e
  deduplicada, consolidada por cluster (1 conceito = 1 post denso).
- Filtro de ruído lexical + filtro semântico contrastivo (por embeddings).
- Anti-canibalização em 2 checkpoints (ao enfileirar e antes de publicar):
  Camada 1 lexical (pg_trgm) + Camada 2 semântica (pgvector).
- Geração ancorada na busca real (esboço → expansão), mantendo revisor/correção.
- Citação cruzada: links internos naturais para posts relacionados, com
  allowlist de slugs (link interno nunca quebra).
