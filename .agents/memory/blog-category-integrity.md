---
name: Blog category integrity
description: Single source of truth for site legal categories, why category must be validated server-side, and how public/static posts merge.
---

# Site category + blog post category integrity

Site legal categories have ONE frontend source of truth:
`artifacts/minha-causa-justa/src/data/categories.ts` (`CATEGORIAS` of
`{nome, slug, emoji, descricao}`, `CATEGORIA_NOMES`, type `CategoriaNome`,
helpers `categoriaPorSlug`/`slugDaCategoria`). `BLOG_CATEGORIES` and the
dashboard `AREAS` derive from it. Filtering is by slug query string
(`?categoria=<slug>`) across `/advogados` and `/blog`.

A generated post's macrocategory MUST equal a category `nome`, or it will not
surface under any real blog filter.

**Why:** the public blog filters cards by exact `category` string equality. A
post stored with any other value silently disappears from category views. The
client `mapApiPost` only remaps unknown categories to a default as a last
resort, which would misclassify, not fix, the data.

**How to apply:**
- The server CANNOT import the frontend artifact, so `VALID_CATEGORIES` in
  `artifacts/api-server/src/routes/blog.ts` is a hand-maintained copy of the
  `nome` values. It MUST stay in sync with `categories.ts` whenever categories
  change. Enforce it at the API boundary (reject with 400) on BOTH the ideas and
  post-create routes. Do not rely only on the client.
- Changing categories means touching: `categories.ts` (source), the server
  `VALID_CATEGORIES`, AND any EXISTING DB rows whose `category` holds an old
  value (migrate via SQL UPDATE, e.g. old `INSS`→`INSS e Previdência`,
  `Saúde`→`Plano de Saúde`). Typecheck alone will not catch stale DB data.
- Public blog merges DB (generated) posts ahead of static `BLOG_POSTS`, deduped
  by slug with generated winning; keep `blog.tsx` and `post.tsx` precedence
  consistent.
