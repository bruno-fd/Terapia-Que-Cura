# Minha Causa Justa

Diretório brasileiro de advogados: conecta cidadãos a advogados por área do direito, com blog informativo, área do advogado (perfil, métricas, assinatura paga) e um painel admin.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run generate-daily-posts` — run the daily automatic blog generator once (12 posts, 1 per macrocategory). Meant for a Scheduled Deployment (1x/day).
- Verify the web artifact with `pnpm --filter @workspace/minha-causa-justa run typecheck` (not `build`, which needs the workflow-provided `PORT`/`BASE_PATH`).
- Required env: `DATABASE_URL` (Postgres). Others per feature: `SESSION_SECRET`, `ADMIN_EMAILS`, `ASAAS_*`, `CONSULTA_OAB_KEY`, `EMAIL_FROM`, `APP_PUBLIC_URL`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 · DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod` · API codegen: Orval (from OpenAPI spec) · Build: esbuild (CJS)
- Auth: Clerk (advogados) + Replit Auth/OIDC (admin) · Billing: Asaas · Email: Resend

## Where things live (sources of truth)

- Legal categories: `artifacts/minha-causa-justa/src/data/categories.ts`.
- DB schema: `lib/db/src/schema/` (exported via `index.ts`).
- API contract: `lib/api-spec/openapi.yaml`; codegen produces Zod (`@workspace/api-zod`) + React Query hooks (`@workspace/api-client-react`).
- Blog: generator `artifacts/api-server/src/lib/blog-generator.ts` (Anthropic via Replit proxy); routes `routes/blog.ts`; public merge `src/data/published-posts.ts` (DB) + `src/data/blog.ts` (static); pages `blog.tsx`/`post.tsx`. The home also shows the 3 most recent published posts (same merge, static fallback).
- Admin: page `src/pages/admin.tsx` + helper `src/lib/admin.ts` (tabs "Verificação" = lawyer management, "Blog" = AI generator); server `routes/admin-lawyers.ts` + shared gate `middlewares/requireAdmin.ts`; activity log `lib/db/src/schema/advogado-atividades.ts`.
- Subscriptions: schema `lib/db/src/schema/subscriptions.ts`; Asaas client `artifacts/api-server/src/lib/asaas.ts`; routes `routes/subscription.ts`; frontend `src/lib/assinatura.ts`; page `src/pages/painel-assinatura.tsx`.
- Email: sender `artifacts/api-server/src/lib/email.ts`; pt-BR templates `email-templates.ts`.

## Architecture decisions

### Blog & content
- Posts are DB-backed (`blogPostsTable`). AI generation creates a DRAFT (`published:false`); it goes public only when the admin clicks "Publicar" (PATCH `/admin/blog/posts/{id}`, `updateBlogPost`). Published DB posts are merged ahead of static `BLOG_POSTS`, deduped by slug (generated wins).
- Content has two forms: structured `body` (sections) and `bodyHtml` (richtext via `react-quill-new`). `post.tsx` renders `bodyHtml` when present (Tailwind `prose` + `dangerouslySetInnerHTML`), else `body`. `bodyHtml` is sanitized server-side on write with `sanitize-html` (strict allowlist) — the single XSS barrier.
- `publishedAt` (nullable) records the first publish (null while draft), set server-side on the false→true transition. Date filters/display use `publishedAt` falling back to `createdAt`.
- The AI generator strips em dashes before persisting (honors the no-em-dash rule).
- Shared post-creation lives in `lib/blog-posts.ts` (`persistGeneratedPost(generated, category, {publish})`): sanitizes `bodyHtml`, dedupes slug, sets `publishedAt` when `publish:true`. Used by both the admin manual route and the daily generator.

### Daily automatic blog generation
- `generate-daily-posts.ts` is a standalone entry (esbuild bundles it; npm script `generate-daily-posts`) meant to run once a day via a Scheduled Deployment. It loops the 12 macrocategories and, per category: idempotency skip if a post was already created today (manual or auto), pick a new theme (ideas not matching existing titles), generate, then run `verifyPost` (independent Claude reviewer) BEFORE publishing.
- `verifyPost` (in `blog-generator.ts`) is a second, independent AI pass with a strict REVIEWER_RULES prompt. Deterministic safety net: ANY legal check with `correto:false` forces reject regardless of the model's overall verdict ("na dúvida, reprova"). Rejected posts are DISCARDED (never persisted as draft), only logged.
- Every per-category outcome is recorded in `blog_daily_runs` (schema `lib/db/src/schema/blog-daily-runs.ts`): `runDate`, `category`, `status` (published|rejected|skipped|failed), `reason`, `title`, `postId`. A failure in one category never aborts the batch (per-category try/catch). The process ends the pg pool on finish.
- The daily acceptance metric is surfaced in the /admin Blog tab (`DailyRunsPanel` in `admin.tsx`) via GET `/admin/blog/daily-runs` (`listBlogDailyRuns` in `src/lib/admin.ts`): per-day summary (X of 12 published, rejected/skipped/failed counts) + latest-run detail with rejection reasons. Route is under the `requireAdmin` gate in `routes/blog.ts`.
- Scheduled Deployment setup: create a Scheduled Deployment running `pnpm --filter @workspace/api-server run generate-daily-posts` on a daily cron (its own env inherits `DATABASE_URL` + `AI_INTEGRATIONS_ANTHROPIC_*`). The manual /admin publish flow is unchanged and independent.

### Categories
- 12 legal categories, single source `categories.ts` (`CATEGORIAS` of `{nome, slug, emoji, descricao}` + `CATEGORIA_NOMES`, type `CategoriaNome`, helpers `categoriaPorSlug`/`slugDaCategoria`). `BLOG_CATEGORIES` and dashboard `AREAS` derive from it. URLs filter by slug (`?categoria=<slug>`).
- A post's macrocategory MUST equal a category `nome`, enforced server-side by a `VALID_CATEGORIES` whitelist in `routes/blog.ts` (400 otherwise). The server can't import the frontend, so this list is a hand-maintained copy that MUST stay in sync with `categories.ts`.

### Auth (two independent systems)
- Advogados use Clerk. Admin uses Replit Auth (OIDC), a COMPLETELY SEPARATE login base — the two coexist. Clerk must NOT gate the admin: doing so shared the lawyer base (an admin typing a lawyer email triggered a lawyer password reset).
- Admin server pieces: sessions/users tables `lib/db/src/schema/auth.ts`; OIDC + session store `lib/auth.ts`; `middlewares/authMiddleware.ts` loads `req.user`/`req.isAuthenticated()` from the `sid` cookie (needs `cookie-parser`, mounted before `/api`, independent of Clerk); `routes/auth.ts` (`/api/login|callback|logout`). `/api/admin/*` uses `requireAdmin`: 401 if unauthenticated, 403 if `req.user.email` not in the allowlist, else sets `req.userId`. Allowlist defaults to `bf.damasio@gmail.com`, overridable via `ADMIN_EMAILS` (comma-separated, case-insensitive).
- The `/admin` page gates on `useAuth()` from `@workspace/replit-auth-web` (spinner / "Entrar" → `/api/login?returnTo=/admin` / "Acesso não autorizado" / panel). Copy is generic ("Entrar"/"Sair"), never mentions "Replit". The frontend allowlist is UX-only; the server is the boundary. `admin.ts` relies on the same-origin `sid` cookie (`credentials:"include"`), maps 401→"Faça login" / 403→"sem acesso". Requires `REPL_ID`/`ISSUER_URL` (auto on Replit) + `SESSION_SECRET`.

### Signup: checkout-first, account after payment
- The cadastro funnel (`cadastro-fluxo.tsx`) has 3 steps and creates NO account: Etapa1 identificação (nome/email/CPF/OAB+seccional), Etapa2 atuação (categoria/cidade/estado), Etapa3 checkout (plan pick → anonymous POST `/checkout` → Asaas hosted invoice → `window.location.href = invoiceUrl`). Each step upserts a `cadastro_leads` row keyed by a browser-generated `leadId` (text col `lead_id`, NOT the serial `id`).
- The navbar login button is "Entrar" (→ `/sign-in`). The Clerk SignIn "cadastre-se" link points to `/cadastro` (the funnel), NOT the standalone `/sign-up`. The `/sign-up` route still exists but is reached only via the post-payment invitation ticket.
- The anonymous `/checkout` (origin-gated, no auth) requires the `leadId` to exist AND the posted email to equal the lead's email, then creates the Asaas customer+subscription with `lawyerRef=null`, `leadId` set.
- The account is provisioned ONLY when the Asaas webhook confirms payment: an atomic claim on `subscriptions.accountProvisionedAt` (`UPDATE ... WHERE accountProvisionedAt IS NULL`) guards against duplicates (Asaas fires both PAYMENT_CONFIRMED and PAYMENT_RECEIVED). On first claim it creates a Clerk invitation (redirectUrl `${base}/sign-up`) and sends the "Conta Criada" email. The lawyer sets a password and lands on `/painel/perfil` (Google/SSO hidden).
- Re-checkout for an existing `leadId` cancels the previous Asaas subscription BEFORE overwriting the row with the new `asaasSubscriptionId` — otherwise paying an old invoice fires webhooks for an id no longer stored, and the account is never provisioned.

### Binding subscription ↔ lawyer
- The webhook provisions the account but leaves `lawyerRef` NULL. The subscription is bound to the lawyer by an atomic claim on FIRST authenticated access via `claimSubscriptionForUser(userId, email)` (`lib/subscriptionClaim.ts`): returns the row already owned, else the anonymous row matching the account email (`lawyerRef IS NULL AND customerEmail=email`) in a DETERMINISTIC order (provisioned first, then newest `updatedAt`, limit 1) and claims it (`UPDATE ... WHERE lawyerRef IS NULL`). Both GET `/assinatura` and GET `/perfil` use it, so binding is identical everywhere. `lawyerRef` is unique (one subscription per lawyer).
- First-access profile prefill is bound to the PAID lead: GET `/perfil` (`buildPrefillFromLead`) claims the subscription, reads its `leadId`, and prefills only if that lead's email equals the authenticated (Clerk = payment) email. This blocks the public lead-upsert route from injecting a third party's data. OAB fields are re-verified server-side at prefill time.

### Subscriptions & billing (Asaas)
- Recurring billing, contract-first: GET/POST `/assinatura`, POST `/assinatura/cancelar`, plus a public POST `/assinatura/webhook` (not in the spec). Plans: Mensal R$49,90 (MONTHLY), Anual R$478,80 (YEARLY). Money stored as integer cents (`valueCents`); Asaas API uses reais.
- Created with `billingType:"CREDIT_CARD"`; no card data is sent, so Asaas returns a hosted `invoiceUrl` (the "Pagar agora" button) where the card is entered/tokenized, then every cycle auto-charges.
- Billing email is ALWAYS the authenticated Clerk account email, derived server-side (never client-supplied); 400 if none. `CreateSubscriptionInput` has NO `email` field and `additionalProperties:false` rejects legacy clients sending one.
- Status is derived live from Asaas payments on GET and persisted: any OVERDUE → `atrasada`; else any CONFIRMED/RECEIVED → `ativa`; else `pendente`; cancelled stays `inativa`. The webhook also writes status authoritatively. Works even before a webhook is configured.
- Cancelling stops only FUTURE renewals; the profile stays visible until the paid period ends. `canceledAt` + `accessUntil` (latest PAID dueDate + one cycle) drive this. The canceled-grace rule is evaluated at the TOP of `deriveStatus`, enforced in the public directory filter (`assinaturaVisivel`), and the webhook update carries `isNull(canceledAt)` so a late event can't downgrade a paid-but-canceled row. Re-subscribing resets `canceledAt`/`accessUntil`/`cancelReason`. Cancellation is a two-step retention dialog: reason (7 options + "Prefiro não informar") then a keep-vs-confirm step; the reason is the optional `motivo` of `cancelAssinatura` (persisted to `cancelReason`).
- Env: Replit secrets are global (not env-scoped), so the Asaas key is selected by the env-scoped base URL. BOTH dev and prod point `ASAAS_BASE_URL` to the REAL API `https://api.asaas.com/v3` (sandbox removed from dev on request, so dev hits live Asaas and creates real charges). Production URL → secret `ASAAS_API_KEY_PROD`; sandbox → `ASAAS_API_KEY`; both sent as `access_token`. `isAsaasConfigured()` reports whether the current-env key exists. Optional `ASAAS_WEBHOOK_TOKEN` (header verification), `ASAAS_WEBHOOK_EMAIL` (failure notices).
- The webhook self-registers on startup (`lib/registerAsaasWebhook.ts`, called after `listen`): idempotent by URL, subscribes to PAYMENT_CONFIRMED/RECEIVED/OVERDUE/DELETED/REFUNDED, self-heals. Skipped (non-fatal) when the key or a public domain is missing; never crashes startup.

### Email (Resend)
- Uses the Replit Resend connector (no raw key): `@replit/connectors-sdk` `ReplitConnectors().proxy("resend", ...)`. `sendEmail` is best-effort (never throws) and awaited inline (the deploy target can freeze the instance right after the response). Webhook dedupe is race-safe: the status UPDATE is conditional and only sends when `.returning()` confirms a real transition. Config: `EMAIL_FROM` (default `Minha Causa Justa <contato@minhacausajusta.com.br>`), `APP_PUBLIC_URL`. The sender domain MUST be verified in Resend (DNS) or prod sends fail (unverified Resend only mails `onboarding@resend.dev` to the account owner).

### OAB verification
- CURRENT: verification is a MANUAL admin process. The "Verificação" tab lists real DB lawyers; the admin manages three server-persisted controls: `adminAtivo` (perfil ativo), `oabVerificada` (verificado), `situacaoOab` (regular/irregular/invalido). Rules (server, `routes/admin-lawyers.ts`): verificado only while adminAtivo; situacao only while verificado; "invalido" auto-sets adminAtivo=false + sends the dados-invalidos email; "irregular" sends the situacao-irregular email; every change is appended to `advogado_atividades`. Recipient email = subscription `customerEmail` (fallback paid-lead email); CPF read via the subscription `leadId`, masked.
- Public directory visibility requires `adminAtivo=true` on top of "assinatura ativa + perfil completo" (enforced in `assinaturaVisivel()` and `toProfile().visivel`). Deactivating a lawyer removes them from listings immediately without touching Asaas.
- LEGACY (still present, no longer the gate for the verified badge): the pre-auth automated flow — POST `/verificar-oab` (`routes/oab.ts`) queries the Consulta OAB API via `lib/oab.ts` (matches by OAB number + seccional + name; does NOT look up by CPF), needs `CONSULTA_OAB_KEY`, host default `https://www.consultacrm.com.br/api/index.php` (override `CONSULTA_OAB_URL`); on success it mints an HMAC token (`lib/oabToken.ts`, keyed by `SESSION_SECRET`) that PUT `/perfil` could stamp. CPF is still collected + check-digit validated (`isCpfValido`).

## Product

Public: home, encontrar advogado, cadastro do advogado, blog, páginas institucionais. Área do advogado (Clerk): dashboard com `/painel/perfil`, `/painel/metricas` (liberado automaticamente após 15 dias do `createdAt`; antes mostra o estado de "indexação"), `/painel/assinatura`. Admin (Replit Auth, allowlist): `/admin` com gerador de posts assistido por IA (rascunho → editor richtext → "Publicar") e a aba de verificação/gestão de advogados.

## User preferences

- All user-facing copy must be in Brazilian Portuguese.
- STRICT: never use em dashes (travessões "—") in user-facing text. Use commas, colons, or an en dash instead. Em dashes are allowed only inside code comments.

## Gotchas

- Theme tokens live in `src/index.css`. `primary-50..900`, `accent-100..700`, `neutral-*` map to Tailwind utilities, but semantic `success`/`warning`/`error` are CSS vars NOT exposed as Tailwind classes — use hex: success `#1E7D4F`, warning `#B97D00`, error `#C0392B`.
- Tailwind's `shadow-sm` is transparent here. For cards use `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` + `border border-neutral-200`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
