---
name: Resend transactional email
description: How transactional email is wired in api-server (Replit connector proxy, best-effort sends, triggers) and the constraints that shaped it.
---

# Resend transactional email

Email is sent via the **Replit Resend connector**, not a raw API key. Use `@replit/connectors-sdk`'s `ReplitConnectors().proxy("resend", "/emails", { method, body })`: object `body` is auto JSON-stringified + `Content-Type` set, returns a fetch `Response`, and 401 auto-retries with fresh auth. Reuse one client instance; do not cache results.

**Best-effort rule:** `sendEmail` never throws. Every trigger awaits it but a failure only logs (via `logger`/`req.log`) and never breaks the subscription/profile flow.

**Why await instead of fire-and-forget:** the app deploys on Replit (can be autoscale), where the instance may freeze right after the HTTP response. Backgrounding a send with `void`/`.catch` after `res.json` risks the send never completing. So sends are awaited inline despite the small latency cost. Do not "optimize" these into fire-and-forget.

**Triggers** (all in `api-server`): subscription-created (POST `/assinatura`, with invoiceUrl), payment-confirmed + overdue (Asaas webhook), and welcome (first `/perfil` row creation, email fetched from Clerk via `getAuth(req).userId` + `clerkClient.users.getUser`).

**Webhook dedupe must be race-safe.** Asaas fires both PAYMENT_CONFIRMED and PAYMENT_RECEIVED for one payment. Do the status UPDATE conditionally (`where status != newStatus`) and read `.returning()`: only send the email when a row actually changed. A read-then-compare check is race-prone under concurrent/retried deliveries; the conditional update is the safe pattern.

**Config:** `EMAIL_FROM` (default `contato@terapiaquecura.com.br`) and `APP_PUBLIC_URL` (default `https://terapiaquecura.com.br`). The sender domain MUST be verified in Resend (DNS) or production sends fail; unverified Resend only sends test mail from `onboarding@resend.dev` to the account owner.

**Copy rule:** all email copy is pt-BR with NO em dashes in user-facing text (allowed only in code comments).
