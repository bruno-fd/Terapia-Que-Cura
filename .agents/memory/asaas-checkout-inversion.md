---
name: Asaas Checkout lifecycle inversion
description: Why the subscription flow is keyed by checkout id and backfilled on CHECKOUT_PAID, and the rules the webhook must obey.
---

# Asaas Checkout inverts the subscription lifecycle

The signup funnel and the panel "reassinar" both use **Asaas Checkout** (hosted
payment page `POST /checkouts`, no company/CNPJ banner) instead of the old
hosted invoice (`invoiceUrl`). Transparent/embedded checkout was rejected — it
needs account approval the merchant lacks.

**Core inversion:** with Asaas Checkout the recurring subscription (and the
customer) are created by Asaas **only after** the payment succeeds. So our row is
created keyed by `asaasCheckoutId` with `asaasSubscriptionId`/`asaasCustomerId`
NULL, and those are backfilled on the `CHECKOUT_PAID` webhook.

**Why (schema):** `asaasCustomerId` and `asaasSubscriptionId` are nullable and a
nullable `asaasCheckoutId` exists precisely because the ids don't exist until
payment. Don't "fix" them back to NOT NULL.

## customerData is optional but all-or-nothing (phone required)
On `POST /checkouts`, `customerData` is optional — omit it and the Asaas page
collects the payer's name/CPF/email/phone itself. But if you send it, Asaas
**requires `phone`** ("O campo phoneNumber deve ser informado"); a partial
`customerData` (name/cpf/email, no phone) 502s. There is no "existing customer
id" param for checkout, so you cannot prefill just some fields.
**Decision:** we do NOT ask for phone on our pages (users trust entering
sensitive data on the checkout), so we omit `customerData` unless a phone is
present — in practice it's always omitted and the payer fills everything on the
Asaas page. CPF stays on the funnel only because it also gates CRP verification,
not for Asaas.

## CHECKOUT_PAID is the authoritative provisioning trigger
Payload contains `checkout.id`, `checkout.customer`, `checkout.status` — but NOT
the created subscription id. Resolution: find our row by `asaasCheckoutId`, then
`GET /subscriptions?customer={customerId}`, pick the sub whose
`externalReference` == our `leadId`, else the newest by `dateCreated`.

**Non-obvious rules the handler must keep (a review caught these):**
- **Never mark `ativa` / provision without a resolved `asaasSubscriptionId`.**
  Future `PAYMENT_*` events (renewal/overdue/refund) correlate by
  `asaasSubscriptionId`; a paid row with a null sub id is orphaned and behaves
  like an unpaid pending checkout. If resolution fails, respond **503** so Asaas
  re-delivers (the sub appears moments after payment) — do not 200.
- **Gate provisioning on the guarded update actually succeeding.** The
  `status=ativa` update is guarded by `isNull(canceledAt)`; provision only the
  row returned by that update (plus an early return when `row.canceledAt` is
  already set), or a late CHECKOUT_PAID on a locally-cancelled row still sends
  the Clerk invite / "conta criada" email.
- **Don't log success unconditionally.** Distinct warn logs for no-row /
  cancelled / unresolved-subscription; only log "processado" on real success.

PAYMENT_CONFIRMED arriving before CHECKOUT_PAID is a harmless no-op (no row
matches the null sub id); CHECKOUT_PAID then links + activates. PAYMENT_* keep
handling renewals/overdue/refund and act as an idempotent provisioning safety net.

## Deploy-time (per publish)
- Apply the additive migration to prod (drop NOT NULL on the two id cols; add
  `asaas_checkout_id text`).
- Register `CHECKOUT_PAID` on the prod Asaas webhook. The account is at the
  **10-webhook cap**, so the auto-registrar's create call 400s ("máx 10");
  add the event to the existing webhook rather than relying on auto-create.
- `ASAAS_BASE_URL` currently points at **production** (`api.asaas.com`) in dev
  too (sandbox retired), so do NOT run live checkout-create calls to "test" —
  they create real objects on the merchant's prod account with the prod key.
