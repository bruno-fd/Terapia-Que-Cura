---
name: Blog category integrity
description: Why generated blog posts must validate category server-side and how public/static posts merge.
---

# Blog post category integrity

A generated post's macrocategory MUST equal one of the blog's `BLOG_CATEGORIES`
(`INSS`, `Trabalhista`, `Família`, `Previdenciário`, `Saúde`, `Consumidor`,
`Inventário e Herança`), or it will not surface under any real blog filter.

**Why:** the public blog filters cards by exact `category` string equality. A
post stored with any other value silently disappears from category views. The
client `mapApiPost` only remaps unknown categories to a default as a last
resort, which would misclassify, not fix, the data.

**How to apply:**
- Enforce the whitelist at the API boundary (`VALID_CATEGORIES` set in
  `artifacts/api-server/src/routes/blog.ts`), rejecting anything else with 400,
  on BOTH the ideas and post-create routes. Do not rely only on the client.
- If `BLOG_CATEGORIES` changes in the frontend, update the server whitelist in
  lockstep, the two lists are duplicated (frontend `data/blog.ts`, server route).
- Public blog merges DB (generated) posts ahead of static `BLOG_POSTS`, deduped
  by slug with generated winning; keep `blog.tsx` and `post.tsx` precedence
  consistent.
