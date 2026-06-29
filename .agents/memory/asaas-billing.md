---
name: Asaas recurring billing
description: Non-obvious gotchas when working with the Asaas payment gateway (Minha Causa Justa subscriptions).
---

# Asaas billing gotchas

- Auth header is `access_token` (NOT `Authorization: Bearer`). Easy to get wrong; Asaas silently 401s otherwise.
- `billingType: "UNDEFINED"` is intentional, not a placeholder: it makes Asaas render a hosted invoice where the customer chooses PIX/Boleto/Card. Do not "fix" it to a concrete method without a product decision.
- On subscription creation, Asaas returns `nextDueDate` as the NEXT cycle date, while the FIRST payment's due date is the date you passed in. So a fresh subscription's `nextDueDate` legitimately reads ~1 cycle ahead of the first invoice. Not a bug.
- Derive subscription status live from the payments list, but ONLY persist when the payments fetch succeeded. **Why:** on a transient Asaas/network failure the payments list comes back empty, and blindly deriving would downgrade a real `ativa` subscription to `pendente`.
- Sandbox testing POST creates a REAL customer+subscription and a DB row; clean up after (cancel deletes on Asaas, then delete the demo row). Asaas rejects invalid CPFs, so use a CPF-valid test value.
- Sandbox and production are SEPARATE Asaas accounts with SEPARATE keys (sandbox `$aact_hmlg_...`, prod `$aact_prod_...`). Replit secrets are global (not env-scoped), so you cannot just "swap" one key per env. **Decision:** keep two secrets (`ASAAS_API_KEY` sandbox, `ASAAS_API_KEY_PROD` prod) and select by the env-scoped `ASAAS_BASE_URL` (sandbox vs api.asaas.com). **Why:** lets dev keep hitting sandbox while prod uses real money, with no per-deploy key juggling.
- A prod account must be document-verified (`status: "APPROVED"` on GET `/myAccount`) before the prod key works; an unverified prod key 401s. Validate a new prod key with a read-only GET `/myAccount` against api.asaas.com before going live.
- Webhook auth token re-sync: Asaas's webhook LIST response omits `authToken`, so if a webhook was created before `ASAAS_WEBHOOK_TOKEN` existed, a naive mismatch check never re-applies it, leaving the webhook permanently unauthenticated. Treat "token configured but list shows no token" as needs-update (idempotent re-sync on startup).
