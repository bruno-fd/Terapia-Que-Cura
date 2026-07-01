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

- Legal categories source of truth: `artifacts/minha-causa-justa/src/data/categories.ts`.
- DB schema source of truth: `lib/db/src/schema/` (blog posts in `blog-posts.ts`, exported via `index.ts`).
- API contract source of truth: `lib/api-spec/openapi.yaml`; run `pnpm --filter @workspace/api-spec run codegen` to regenerate Zod (`@workspace/api-zod`) and React Query hooks (`@workspace/api-client-react`).
- Blog generation logic: `artifacts/api-server/src/lib/blog-generator.ts` (Anthropic via Replit proxy); blog routes: `artifacts/api-server/src/routes/blog.ts`.
- Public blog data merge: `artifacts/minha-causa-justa/src/data/published-posts.ts` (DB posts) + `data/blog.ts` (static posts); pages `blog.tsx` / `post.tsx`.
- Admin page + client API helper: `artifacts/minha-causa-justa/src/pages/admin.tsx` + `src/lib/admin.ts`.
- Subscriptions (Asaas): DB schema `lib/db/src/schema/subscriptions.ts`; Asaas REST client `artifacts/api-server/src/lib/asaas.ts`; routes `artifacts/api-server/src/routes/subscription.ts`; frontend helper `artifacts/minha-causa-justa/src/lib/assinatura.ts`; page `src/pages/painel-assinatura.tsx`.
- Transactional email (Resend): sender `artifacts/api-server/src/lib/email.ts`; pt-BR HTML templates `artifacts/api-server/src/lib/email-templates.ts`. Triggered from `routes/subscription.ts` (assinatura criada + webhook pagamento confirmado/atrasado) and `routes/lawyer.ts` (boas-vindas no primeiro acesso ao painel).

## Architecture decisions

- Blog posts are DB-backed (Drizzle, `blogPostsTable`). AI generation creates a DRAFT (`published:false`); the post only goes public when the admin clicks "Publicar" (PATCH `/admin/blog/posts/{id}`, operationId `updateBlogPost`). Published DB posts are merged ahead of the static `BLOG_POSTS`, deduped by slug (generated wins).
- Post content has two representations: the original structured `body` (sections) and `bodyHtml` (richtext produced/edited in the admin via `react-quill-new`). Public `post.tsx` renders `bodyHtml` (Tailwind `prose` + `dangerouslySetInnerHTML`) when present, else falls back to `body` sections. `bodyHtml` is sanitized server-side on write with `sanitize-html` (strict allowlist), the single XSS barrier.
- `publishedAt` (nullable timestamp) records the first publish; null while draft. Admin list date filter and public post date use `publishedAt` (falling back to `createdAt`). Set server-side on the false to true publish transition.
- Site legal categories (12 of them) have a single source of truth: `artifacts/minha-causa-justa/src/data/categories.ts` (`CATEGORIAS` array of `{nome, slug, emoji, descricao}`, plus `CATEGORIA_NOMES`, type `CategoriaNome`, and helpers `categoriaPorSlug`/`slugDaCategoria`). `BLOG_CATEGORIES` and the dashboard `AREAS` both derive from it. URLs filter by slug query string (`?categoria=<slug>`) everywhere (`/advogados`, `/blog`).
- Post macrocategory MUST equal a category `nome`. This is enforced server-side: a `VALID_CATEGORIES` whitelist in `routes/blog.ts` rejects anything else with 400. The server cannot import the frontend artifact, so `VALID_CATEGORIES` is a hand-maintained copy that MUST stay in sync with `categories.ts` (`nome` field).
- Admin auth is a simulated gate: hardcoded password `123456`, checked client-side and via the `x-admin-password` header on `/api/admin/*` routes. Not real auth, by design.
- The AI generator strips em dashes before persisting, to honor the strict no-em-dash copy rule.
- Lawyer subscriptions use Asaas (Brazilian gateway) recurring billing. Contract-first: GET `/assinatura` (`getAssinatura`), POST `/assinatura` (`createAssinatura`), POST `/assinatura/cancelar` (`cancelAssinatura`), plus a public webhook POST `/assinatura/webhook` (NOT in the OpenAPI spec). Plans: Mensal R$49,90 (MONTHLY), Anual R$478,80 (YEARLY). Money stored as integer cents (`valueCents`); Asaas API uses reais (`valueCents/100`).
- Asaas subscriptions are created with `billingType: "CREDIT_CARD"` (recurring card subscription). No card data is sent, so Asaas returns a hosted invoice (`invoiceUrl`) where the customer enters the card; the card is tokenized and every subsequent cycle auto-charges. The invoice URL is surfaced as `invoiceUrl` for the "Pagar agora" button. Verified against the live Asaas API: a CREDIT_CARD subscription yields a PENDING card payment with a hosted `invoiceUrl`.
- Each subscription is tied to the authenticated lawyer via `subscriptions.lawyerRef = req.userId` (Clerk user id). The `lawyerRef` column is unique (one subscription per lawyer).
- Subscription status is derived live from Asaas payments on GET (and persisted): any OVERDUE → `atrasada`; else any CONFIRMED/RECEIVED/RECEIVED_IN_CASH → `ativa`; else `pendente`; a cancelled row stays `inativa`. The webhook also writes status authoritatively (PAYMENT_CONFIRMED/RECEIVED → ativa, PAYMENT_OVERDUE → atrasada, PAYMENT_DELETED/REFUNDED → inativa). This makes the demo work even before any webhook is configured.
- Required env for billing: Asaas uses different keys for sandbox vs production, and Replit secrets are global (not env-scoped), so the key is selected by the (env-scoped) base URL: `ASAAS_BASE_URL` is `https://sandbox.asaas.com/api/v3` in development and `https://api.asaas.com/v3` in production. When the base URL is production, the client uses secret `ASAAS_API_KEY_PROD` (the `$aact_prod_...` key); otherwise it uses `ASAAS_API_KEY` (the sandbox `$aact_hmlg_...` key). Both are sent as the `access_token` header. `asaas.ts` exposes `isAsaasConfigured()` (true when the key for the current env exists); the webhook self-registration uses it to decide whether to run. Optional `ASAAS_WEBHOOK_TOKEN` enables `asaas-access-token` header verification on the webhook (recommended in production). Optional `ASAAS_WEBHOOK_EMAIL` sets the webhook failure-notification email (falls back to the Asaas account email).
- Transactional email uses the Replit Resend connector (no raw API key): `@replit/connectors-sdk` `ReplitConnectors().proxy("resend", "/emails", {...})`. `sendEmail` is best-effort (never throws, logs on failure) and is awaited inline rather than fire-and-forget, because the deploy target can freeze the instance right after the response. Webhook email dedupe is race-safe: the status UPDATE is conditional (`where status != newStatus`) and only sends when `.returning()` confirms a real transition (Asaas fires both PAYMENT_CONFIRMED and PAYMENT_RECEIVED). Welcome email pulls the recipient from Clerk (`getAuth(req).userId` + `clerkClient.users.getUser`). Config: `EMAIL_FROM` (default `Minha Causa Justa <contato@minhacausajusta.com.br>`) and `APP_PUBLIC_URL` (default `https://minhacausajusta.com.br`). The sender domain MUST be verified in Resend (DNS) or production sends fail; unverified Resend only sends test mail from `onboarding@resend.dev` to the account owner.
- OAB verification is REAL and server-side: the cadastro funnel Etapa 1 (`StepIdentificacao`) posts CPF+OAB+seccional+nome to the public POST `/verificar-oab` (`routes/oab.ts`), which queries the OAB CNA SOAP webservice via `lib/oab.ts` (raw SOAP envelope over fetch, 8s AbortController + 1 retry, tolerant XML parse). The endpoint has an origin/Referer guard against `REPLIT_DOMAINS`. Requires secret `OAB_CNA_KEY` (sent as the SOAP `Authentication>Key` header); when absent, `isOabConfigured()` is false and verification returns `motivo:"erro_servico"`. Etapa 1 also has a mandatory CPF field with real check-digit validation (`isCpfValido` in `cadastro-funnel.ts`). Service failure/network error (`erro_servico`) NEVER blocks cadastro: it advances with `oabVerificacaoPendente:true` (manual review) by design.
- The "verified" status is server-managed and unforgeable. Verification runs PRE-auth (funnel/localStorage, before Clerk sign-in), so it cannot be bound to `req.userId` at mint time. Instead, on `valido:true` the server mints an HMAC-SHA256 signed token (`lib/oabToken.ts`, keyed by `SESSION_SECRET`, 30min TTL, `timingSafeEqual`, base64url payload `{cpf,oab,seccional,situacao,nomeOab,exp}`) returned as `VerificarOabResult.token`. The funnel carries it as `oabToken` and `StepPerfil` sends it in PUT `/perfil`. `UpdateProfileInput` deliberately does NOT accept `oabVerificada/oabSituacao/oabNomeConfirmado/oabVerificadaEm` (only `oabToken` + the least-privilege `oabVerificacaoPendente` flag). PUT `/perfil` sets `oabVerificada=true` (plus situacao/nomeConfirmado FROM the token payload, never client-chosen) ONLY when the token verifies AND `tokenCombinaComOab` matches the profile's OAB number and seccional (parsed from the stored `OAB/UF 123456` string). If `SESSION_SECRET` is missing, signing and verification both return null (secure default: never marks verified). Residual accepted risk: a token is replayable across accounts by anyone who already knows a real lawyer's CPF+name+OAB (all must pass the live CNA check), but the stamped `oabNomeConfirmado` is the verified lawyer's real name from the token, limiting practical impersonation. Closing this fully would require a stateful single-use nonce store, deferred as out of scope for the pre-auth funnel architecture.
- The Asaas webhook is registered programmatically on server startup (`artifacts/api-server/src/lib/registerAsaasWebhook.ts`, called from `index.ts` after `listen`). It is idempotent (matched by URL `https://<REPLIT_DOMAINS first host>/api/assinatura/webhook`), subscribes to PAYMENT_CONFIRMED/RECEIVED/OVERDUE/DELETED/REFUNDED, and self-heals (re-enables / fixes events). This makes payment -> `ativa` -> visible on `/advogados` automatic, with no manual Asaas dashboard setup. Registration is skipped (logged, non-fatal) when the env-appropriate Asaas key (`isAsaasConfigured()`) or a public domain is missing; any failure is logged and never crashes startup.

## Product

"Minha Causa Justa" is a Brazilian lawyer-directory web app (artifact slug `minha-causa-justa`, previewPath `/`). Public side: home, find-a-lawyer, lawyer registration, blog, institutional pages. Lawyer area (simulated localStorage auth): `/login` plus a dashboard with `/painel/perfil` (profile editing), `/painel/metricas` (performance metrics), and `/painel/assinatura` (subscription management). Admin area (simulated gate, password `123456`): `/admin` with an AI-assisted blog-post generator (pick a macrocategory matching `BLOG_CATEGORIES`, generate 10 idea titles or a free theme, write a full OAB-compliant post). Generated posts are DRAFTS opened in a richtext editor (`PostEditor` + `RichTextEditor`); admin edits title/subtitle/category/excerpt/body then clicks "Publicar". A management list below filters posts by category and publication-date range, with "Editar" reopening any post in the editor.

## User preferences

- All user-facing copy must be in Brazilian Portuguese.
- STRICT: never use em dashes (travessões "—") in user-facing text. Use commas, colons, or an en dash instead. Em dashes are allowed only inside code comments.

## Gotchas

- Theme tokens live in `artifacts/minha-causa-justa/src/index.css`. `primary-50..900`, `accent-100..700`, and `neutral-*` map to Tailwind utilities, but the semantic colors `success`/`warning`/`error` are CSS vars NOT exposed as Tailwind classes. Use arbitrary hex instead: success `#1E7D4F`, warning `#B97D00`, error `#C0392B`.
- Tailwind's `shadow-sm` is transparent here. For cards use `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` plus `border border-neutral-200`.
- Verify with `pnpm --filter @workspace/minha-causa-justa run typecheck` (not `build`, which needs workflow-provided `PORT`/`BASE_PATH`).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
