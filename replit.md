# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema source of truth: `lib/db/src/schema/` (blog posts in `blog-posts.ts`, exported via `index.ts`).
- API contract source of truth: `lib/api-spec/openapi.yaml`; run `pnpm --filter @workspace/api-spec run codegen` to regenerate Zod (`@workspace/api-zod`) and React Query hooks (`@workspace/api-client-react`).
- Blog generation logic: `artifacts/api-server/src/lib/blog-generator.ts` (Anthropic via Replit proxy); blog routes: `artifacts/api-server/src/routes/blog.ts`.
- Public blog data merge: `artifacts/minha-causa-justa/src/data/published-posts.ts` (DB posts) + `data/blog.ts` (static posts); pages `blog.tsx` / `post.tsx`.
- Admin page + client API helper: `artifacts/minha-causa-justa/src/pages/admin.tsx` + `src/lib/admin.ts`.

## Architecture decisions

- Blog posts are DB-backed (Drizzle, `blogPostsTable`). Generated posts are published immediately and merged ahead of the static `BLOG_POSTS`, deduped by slug (generated wins).
- Post macrocategory MUST equal the blog's `BLOG_CATEGORIES`. This is enforced server-side: a `VALID_CATEGORIES` whitelist in `routes/blog.ts` rejects anything else with 400, so generated posts always land in a real blog category.
- Admin auth is a simulated gate: hardcoded password `123456`, checked client-side and via the `x-admin-password` header on `/api/admin/*` routes. Not real auth, by design.
- The AI generator strips em dashes before persisting, to honor the strict no-em-dash copy rule.

## Product

"Minha Causa Justa" is a Brazilian lawyer-directory web app (artifact slug `minha-causa-justa`, previewPath `/`). Public side: home, find-a-lawyer, lawyer registration, blog, institutional pages. Lawyer area (simulated localStorage auth): `/login` plus a dashboard with `/painel/perfil` (profile editing), `/painel/metricas` (performance metrics), and `/painel/assinatura` (subscription management). Admin area (simulated gate, password `123456`): `/admin` with an AI-assisted blog-post generator (pick a macrocategory matching `BLOG_CATEGORIES`, generate 10 idea titles or a free theme, write a full OAB-compliant post that auto-publishes into the matching public blog category).

## User preferences

- All user-facing copy must be in Brazilian Portuguese.
- STRICT: never use em dashes (travessões "—") in user-facing text. Use commas, colons, or an en dash instead. Em dashes are allowed only inside code comments.

## Gotchas

- Theme tokens live in `artifacts/minha-causa-justa/src/index.css`. `primary-50..900`, `accent-100..700`, and `neutral-*` map to Tailwind utilities, but the semantic colors `success`/`warning`/`error` are CSS vars NOT exposed as Tailwind classes. Use arbitrary hex instead: success `#1E7D4F`, warning `#B97D00`, error `#C0392B`.
- Tailwind's `shadow-sm` is transparent here. For cards use `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` plus `border border-neutral-200`.
- Verify with `pnpm --filter @workspace/minha-causa-justa run typecheck` (not `build`, which needs workflow-provided `PORT`/`BASE_PATH`).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
