# Terapia Que Cura

Diretório brasileiro de psicólogos: conecta pessoas a psicólogos por área/tema de saúde mental, com blog informativo, área do psicólogo (perfil, métricas, assinatura paga) e um painel admin.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run generate-daily-posts` — run the daily automatic blog generator once (14 posts, 1 per macrocategory). Meant for a Scheduled Deployment (1x/day).
- Verify the web artifact with `pnpm --filter @workspace/minha-causa-justa run typecheck` (not `build`, which needs the workflow-provided `PORT`/`BASE_PATH`). NOTE: the package name/directory (`minha-causa-justa`) is legacy from before the rebrand to "Terapia Que Cura"; a directory/package rename is a separate, larger follow-up (touches every import path).
- Required env: `DATABASE_URL` (Postgres). Others per feature: `SESSION_SECRET`, `ADMIN_EMAILS`, `ASAAS_*`, `CONSULTA_OAB_KEY`, `EMAIL_FROM`, `APP_PUBLIC_URL`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 · DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod` · API codegen: Orval (from OpenAPI spec) · Build: esbuild (CJS)
- Auth: Clerk (psicólogos) + Replit Auth/OIDC (admin) · Billing: Asaas · Email: Resend

## Where things live (sources of truth)

- Psychology categories: `artifacts/minha-causa-justa/src/data/categories.ts` (14 macrocategories, no emoji field — the site does not display emoji).
- DB schema: `lib/db/src/schema/` (exported via `index.ts`). Tables: `psicologos`, `psicologo_atividades`, `cadastro_leads`, `subscriptions`, `blog_posts`, `blog_daily_runs`, `auth`.
- API contract: `lib/api-spec/openapi.yaml`; codegen produces Zod (`@workspace/api-zod`) + React Query hooks (`@workspace/api-client-react`).
- Blog: generator `artifacts/api-server/src/lib/blog-generator.ts` (Anthropic via Replit proxy); routes `routes/blog.ts`; public merge `src/data/published-posts.ts` (DB) + `src/data/blog.ts` (static); pages `blog.tsx`/`post.tsx`. The home also shows the 3 most recent published posts (same merge, static fallback).
- Admin: page `src/pages/admin.tsx` + helper `src/lib/admin.ts` (tabs "Verificação" = psychologist management, "Blog" = AI generator); server `routes/admin-psicologos.ts` + shared gate `middlewares/requireAdmin.ts`; activity log `lib/db/src/schema/psicologo-atividades.ts`.
- Subscriptions: schema `lib/db/src/schema/subscriptions.ts` (owner column `psicologoRef`); Asaas client `artifacts/api-server/src/lib/asaas.ts`; routes `routes/subscription.ts`; frontend `src/lib/assinatura.ts`; page `src/pages/painel-assinatura.tsx`.
- Email: sender `artifacts/api-server/src/lib/email.ts`; pt-BR templates `email-templates.ts`.

## Architecture decisions

### Blog & content
- Posts are DB-backed (`blogPostsTable`). AI generation creates a DRAFT (`published:false`); it goes public only when the admin clicks "Publicar" (PATCH `/admin/blog/posts/{id}`, `updateBlogPost`). Published DB posts are merged ahead of static `BLOG_POSTS`, deduped by slug (generated wins).
- Content has two forms: structured `body` (sections) and `bodyHtml` (richtext via `react-quill-new`). `post.tsx` renders `bodyHtml` when present (Tailwind `prose` + `dangerouslySetInnerHTML`), else `body`. `bodyHtml` is sanitized server-side on write with `sanitize-html` (strict allowlist) — the single XSS barrier.
- `publishedAt` (nullable) records the first publish (null while draft), set server-side on the false→true transition. Date filters/display use `publishedAt` falling back to `createdAt`.
- The AI generator strips em dashes before persisting (honors the no-em-dash rule).
- Shared post-creation lives in `lib/blog-posts.ts` (`persistGeneratedPost(generated, category, {publish})`): sanitizes `bodyHtml`, dedupes slug, sets `publishedAt` when `publish:true`. Used by both the admin manual route and the daily generator.

### Daily automatic blog generation
- `generate-daily-posts.ts` is a standalone entry (esbuild bundles it; npm script `generate-daily-posts`) meant to run once a day via a Scheduled Deployment. It loops the 14 macrocategories and, per category: idempotency skip if a post was already created today (manual or auto), pick a new theme (ideas not matching existing titles), generate, then run `verifyPost` (independent Claude reviewer).
- `verifyPost` (in `blog-generator.ts`) is a second, independent AI pass with a strict REVIEWER_RULES prompt. Deterministic safety net: ANY technical check with `correto:false` forces reject regardless of the model's overall verdict ("na dúvida, reprova"); posts touching suicidal ideation/self-harm/abuse are additionally required to include the CVV (188) safety line in the closing, checked deterministically (`ePostDeRisco`/`encerramentoTemOrientacaoDeRisco`).
- Writer/reviewer correction loop: on reject, `correctPost` (third AI pass, in `blog-generator.ts`) rewrites ONLY the flagged issues (fix a technical datum only with high confidence, else generalize it; never invent) and the result is re-verified, up to `MAX_CORRECOES=2` rounds. The FIRST approved version is published; a post is DISCARDED only if still rejected after the rounds. `EDITORIAL_RULES` follows the Código de Ética Profissional do Psicólogo (CFP, Resolução nº 010/2005): veracity discipline, conditional CFP closing template, mandatory CVV safety line for risk topics, self-check checklist. IMPORTANT: writer and reviewer prompts must stay consistent, the reviewer's REVIEWER_RULES explicitly PERMIT the conditional closings the writer is told to use (e.g. "pode ser importante conversar com um psicólogo"), otherwise the reviewer rejects the exact mandated phrasing and the loop can never converge.
- Every per-category outcome is recorded in `blog_daily_runs` (schema `lib/db/src/schema/blog-daily-runs.ts`): `runDate`, `category`, `status` (published|rejected|skipped|failed), `reason`, `title`, `postId`, `correctionRounds` (how many correction passes before the outcome; published-after-correction = published with rounds>0). A failure in one category never aborts the batch (per-category try/catch). The process ends the pg pool on finish.
- The daily acceptance metric is surfaced in the /admin Blog tab (`DailyRunsPanel` in `admin.tsx`) via GET `/admin/blog/daily-runs` (`listBlogDailyRuns` in `src/lib/admin.ts`): per-day summary (X of 14 published, of which `corrected` after correction, plus rejected/skipped/failed counts) + latest-run detail with rejection reasons and per-category correction rounds. Route is under the `requireAdmin` gate in `routes/blog.ts`.
- Scheduled Deployment setup: create a Scheduled Deployment running `pnpm --filter @workspace/api-server run generate-daily-posts` on a daily cron (its own env inherits `DATABASE_URL` + `AI_INTEGRATIONS_ANTHROPIC_*`). The manual /admin publish flow is unchanged and independent.

### Categories
- 14 psychology macrocategories, single source `categories.ts` (`CATEGORIAS` of `{nome, slug, descricao, subcategorias}` + `CATEGORIA_NOMES`, type `CategoriaNome`, helpers `categoriaPorSlug`/`slugDaCategoria`). No `emoji` field: the site does not display category emoji (product decision). `BLOG_CATEGORIES` and dashboard `AREAS` derive from it. URLs filter by slug (`?categoria=<slug>`).
- A post's macrocategory MUST equal a category `nome`, enforced server-side by a `VALID_CATEGORIES` whitelist in `routes/blog.ts` (400 otherwise). The server can't import the frontend, so this list is a hand-maintained copy (`artifacts/api-server/src/lib/categorias.ts`) that MUST stay in sync with `categories.ts`.
- `publicoAtendido` (public served, e.g. Adultos/Crianças/Casais/LGBTQIA+) is a separate multi-select field on the profile/lead/search, defined in `lib/dashboard.ts` (`PUBLICO_ATENDIDO`), not part of the category tree.

### Auth (two independent systems)
- Psicólogos use Clerk. Admin uses Replit Auth (OIDC), a COMPLETELY SEPARATE login base — the two coexist. Clerk must NOT gate the admin: doing so shared the psychologist base (an admin typing a psychologist email triggered a password reset).
- Admin server pieces: sessions/users tables `lib/db/src/schema/auth.ts`; OIDC + session store `lib/auth.ts`; `middlewares/authMiddleware.ts` loads `req.user`/`req.isAuthenticated()` from the `sid` cookie (needs `cookie-parser`, mounted before `/api`, independent of Clerk); `routes/auth.ts` (`/api/login|callback|logout`). `/api/admin/*` uses `requireAdmin`: 401 if unauthenticated, 403 if `req.user.email` not in the allowlist, else sets `req.userId`. Allowlist defaults to `bf.damasio@gmail.com`, overridable via `ADMIN_EMAILS` (comma-separated, case-insensitive).
- The `/admin` page gates on `useAuth()` from `@workspace/replit-auth-web` (spinner / "Entrar" → `/api/login?returnTo=/admin` / "Acesso não autorizado" / panel). Copy is generic ("Entrar"/"Sair"), never mentions "Replit". The frontend allowlist is UX-only; the server is the boundary. `admin.ts` relies on the same-origin `sid` cookie (`credentials:"include"`), maps 401→"Faça login" / 403→"sem acesso". Requires `REPL_ID`/`ISSUER_URL` (auto on Replit) + `SESSION_SECRET`.

### Signup: checkout-first, account after payment
- The cadastro funnel (`cadastro-fluxo.tsx`) has 3 steps and creates NO account: Etapa1 identificação (nome/email/CPF/CRP+região), Etapa2 atuação (categoria/cidade/estado/público atendido), Etapa3 checkout (plan pick → anonymous POST `/checkout` → Asaas hosted invoice → `window.location.href = invoiceUrl`). Each step upserts a `cadastro_leads` row keyed by a browser-generated `leadId` (text col `lead_id`, NOT the serial `id`).
- The navbar login button is "Entrar" (→ `/sign-in`). The Clerk SignIn "cadastre-se" link points to `/cadastro` (the funnel), NOT the standalone `/sign-up`. The `/sign-up` route still exists but is reached only via the post-payment invitation ticket.
- The anonymous `/checkout` (origin-gated, no auth) requires the `leadId` to exist AND the posted email to equal the lead's email, then creates the Asaas customer+subscription with `psicologoRef=null`, `leadId` set.
- The account is provisioned ONLY when the Asaas webhook confirms payment: an atomic claim on `subscriptions.accountProvisionedAt` (`UPDATE ... WHERE accountProvisionedAt IS NULL`) guards against duplicates (Asaas fires both PAYMENT_CONFIRMED and PAYMENT_RECEIVED). On first claim it creates a Clerk invitation (redirectUrl `${base}/sign-up`) and sends the "Conta Criada" email. The psicólogo sets a password and lands on `/painel/perfil` (Google/SSO hidden).
- Re-checkout for an existing `leadId` cancels the previous Asaas subscription BEFORE overwriting the row with the new `asaasSubscriptionId` — otherwise paying an old invoice fires webhooks for an id no longer stored, and the account is never provisioned.

### Binding subscription ↔ psicólogo
- The webhook provisions the account but leaves `psicologoRef` NULL. The subscription is bound to the psicólogo by an atomic claim on FIRST authenticated access via `claimSubscriptionForUser(userId, email)` (`lib/subscriptionClaim.ts`): returns the row already owned, else the anonymous row matching the account email (`psicologoRef IS NULL AND customerEmail=email`) in a DETERMINISTIC order (provisioned first, then newest `updatedAt`, limit 1) and claims it (`UPDATE ... WHERE psicologoRef IS NULL`). Both GET `/assinatura` and GET `/perfil` use it, so binding is identical everywhere. `psicologoRef` is unique (one subscription per psicólogo).
- First-access profile prefill is bound to the PAID lead: GET `/perfil` (`buildPrefillFromLead`) claims the subscription, reads its `leadId`, and prefills only if that lead's email equals the authenticated (Clerk = payment) email. This blocks the public lead-upsert route from injecting a third party's data. CRP fields are re-verified server-side at prefill time (see "CRP verification" below).

### Subscriptions & billing (Asaas)
- Recurring billing, contract-first: GET/POST `/assinatura`, POST `/assinatura/cancelar`, plus a public POST `/assinatura/webhook` (not in the spec). Plans: Mensal R$49,90 (MONTHLY), Anual R$478,80 (YEARLY). Money stored as integer cents (`valueCents`); Asaas API uses reais.
- Created with `billingType:"CREDIT_CARD"`; no card data is sent, so Asaas returns a hosted `invoiceUrl` (the "Pagar agora" button) where the card is entered/tokenized, then every cycle auto-charges.
- Billing email is ALWAYS the authenticated Clerk account email, derived server-side (never client-supplied); 400 if none. `CreateSubscriptionInput` has NO `email` field and `additionalProperties:false` rejects legacy clients sending one.
- Status is derived live from Asaas payments on GET and persisted: any OVERDUE → `atrasada`; else any CONFIRMED/RECEIVED → `ativa`; else `pendente`; cancelled stays `inativa`. The webhook also writes status authoritatively. Works even before a webhook is configured.
- Cancelling stops only FUTURE renewals; the profile stays visible until the paid period ends. `canceledAt` + `accessUntil` (latest PAID dueDate + one cycle) drive this. The canceled-grace rule is evaluated at the TOP of `deriveStatus`, enforced in the public directory filter (`assinaturaVisivel`), and the webhook update carries `isNull(canceledAt)` so a late event can't downgrade a paid-but-canceled row. Re-subscribing resets `canceledAt`/`accessUntil`/`cancelReason`. Cancellation is a two-step retention dialog: reason (7 options + "Prefiro não informar") then a keep-vs-confirm step; the reason is the optional `motivo` of `cancelAssinatura` (persisted to `cancelReason`).
- Env: Replit secrets are global (not env-scoped), so the Asaas key is selected by the env-scoped base URL. BOTH dev and prod point `ASAAS_BASE_URL` to the REAL API `https://api.asaas.com/v3` (sandbox removed from dev on request, so dev hits live Asaas and creates real charges). Production URL → secret `ASAAS_API_KEY_PROD`; sandbox → `ASAAS_API_KEY`; both sent as `access_token`. `isAsaasConfigured()` reports whether the current-env key exists. Optional `ASAAS_WEBHOOK_TOKEN` (header verification), `ASAAS_WEBHOOK_EMAIL` (failure notices).
- The webhook self-registers on startup (`lib/registerAsaasWebhook.ts`, called after `listen`): idempotent by URL, subscribes to PAYMENT_CONFIRMED/RECEIVED/OVERDUE/DELETED/REFUNDED, self-heals. Skipped (non-fatal) when the key or a public domain is missing; never crashes startup.

### Email (Resend)
- Uses the Replit Resend connector (no raw key): `@replit/connectors-sdk` `ReplitConnectors().proxy("resend", ...)`. `sendEmail` is best-effort (never throws) and awaited inline (the deploy target can freeze the instance right after the response). Webhook dedupe is race-safe: the status UPDATE is conditional and only sends when `.returning()` confirms a real transition. Config: `EMAIL_FROM` (default `Terapia Que Cura <contato@terapiaquecura.com.br>`), `APP_PUBLIC_URL`. The sender domain MUST be verified in Resend (DNS) or prod sends fail (unverified Resend only mails `onboarding@resend.dev` to the account owner).

### CRP verification
- CURRENT: verification is a MANUAL admin process. The "Verificação" tab lists real DB psicólogos; the admin manages three server-persisted controls: `adminAtivo` (perfil ativo), `crpVerificada` (verificado), `situacaoCrp` (regular/irregular/invalido). Rules (server, `routes/admin-psicologos.ts`): verificado only while adminAtivo; situacao only while verificado; "invalido" auto-sets adminAtivo=false + sends the dados-invalidos email; "irregular" sends the situacao-irregular email; every change is appended to `psicologo_atividades`. Recipient email = subscription `customerEmail` (fallback paid-lead email); CPF read via the subscription `leadId`, masked.
- Public directory visibility requires `adminAtivo=true` on top of "assinatura ativa + perfil completo" (enforced in `assinaturaVisivel()` and `toProfile().visivel`). Deactivating a psicólogo removes them from listings immediately without touching Asaas.
- PENDING MIGRATION (not yet implemented): the pre-auth automated flow — POST `/verificar-oab` (`routes/oab.ts`), `lib/oab.ts`, `lib/oabToken.ts` — still targets the OAB (lawyer) webservice from before the rebrand and is effectively inert for psychologists (nobody should get a real match). Research found the same provider (`consultacrm.com.br`) also exposes `tipo=crp` for the Conselho Regional de Psicologia; migrating this flow (rename to `lib/crp.ts`/`crpToken.ts`/`routes/crp.ts`, validate the real response shape with a test API key) is the next step for automated CRP verification. Until then, StepIdentificacao.tsx always routes new signups to manual review (`crpVerificacaoPendente:true`) without calling any external service. CPF is still collected + check-digit validated (`isCpfValido`).

## Product

Public: home, encontrar psicólogo, cadastro do psicólogo, blog, páginas institucionais. Área do psicólogo (Clerk): dashboard com `/painel/perfil`, `/painel/metricas` (liberado automaticamente após 15 dias do `createdAt`; antes mostra o estado de "indexação"), `/painel/assinatura`. Admin (Replit Auth, allowlist): `/admin` com gerador de posts assistido por IA (rascunho → editor richtext → "Publicar") e a aba de verificação/gestão de psicólogos.

## User preferences

- All user-facing copy must be in Brazilian Portuguese.
- STRICT: never use em dashes (travessões "—") in user-facing text. Use commas, colons, or an en dash instead. Em dashes are allowed only inside code comments.
- No emoji in category names or category UI (product decision made during the lawyer→psychologist migration).

## Gotchas

- Theme tokens live in `src/index.css`. `primary-50..900`, `accent-100..700`, `neutral-*` map to Tailwind utilities, but semantic `success`/`warning`/`error` are CSS vars NOT exposed as Tailwind classes — use hex: success `#1E7D4F`, warning `#B97D00`, error `#C0392B`.
- Tailwind's `shadow-sm` is transparent here. For cards use `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` + `border border-neutral-200`.
- Env var names (`CONSULTA_OAB_KEY`, `CONSULTA_OAB_URL`) and the `lib/oab.ts`/`oabToken.ts`/`routes/oab.ts` files still use OAB naming — this is intentional until the CRP verification migration lands (see "CRP verification" above), not an oversight.
- Legacy asset filenames (`advogado-hero.webp`, `advogada-perfil.webp`, `minhacausajusta_*.webp` logo) predate the rebrand; they're still wired up (imports/alt text updated to "psicólogo"/"Terapia Que Cura") but depict the old lawyer-brand imagery. Replacing them with new photography/logo is a follow-up, not done here.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
