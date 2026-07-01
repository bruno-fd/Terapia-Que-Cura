---
name: Asaas recurring card billing
description: How Asaas recurring credit-card subscriptions and env key scoping work in this project
---

# Asaas recurring credit-card subscriptions

- To charge a recurring credit card, create the subscription with `billingType: "CREDIT_CARD"` and send NO card data. Asaas returns a hosted invoice (`invoiceUrl`) where the customer enters the card. The card is tokenized and every subsequent cycle auto-charges. Verified live in sandbox: the first payment is PENDING, billingType CREDIT_CARD, with a hosted `invoiceUrl`.
  - **Why:** `billingType: "UNDEFINED"` instead lets the customer pick PIX/boleto/card, which is NOT a recurring card charge. Use CREDIT_CARD for real recurring billing.

- Env / key scoping: Replit secrets are global (not env-scoped), so the sandbox vs prod key is selected by the env-scoped `ASAAS_BASE_URL`. Both `[userenv.development]` and `[userenv.production]` set `ASAAS_BASE_URL=https://api.asaas.com/v3` (real API); the code default also falls back to the real API. When base URL is production, the client uses `ASAAS_API_KEY_PROD`; otherwise (sandbox) `ASAAS_API_KEY`.
  - **Why:** Sandbox testing was too hard, so development was intentionally pointed at the REAL Asaas API.
  - **How to apply:** Development hits the REAL Asaas API, so testing in the dev preview DOES create real customers/subscriptions/charges. To go back to safe testing, repoint `[userenv.development] ASAAS_BASE_URL` to `https://sandbox.asaas.com/api/v3`. Asaas minimum charge is R$5,00 (cents `valueCents` >= 500).

- Both the sandbox key and the prod key authenticate against the SAME real Asaas account (confirmed via `/myAccount`). Sandbox is just the test environment of that account.

- To live-verify without leaving test data: create a customer + CREDIT_CARD subscription on `https://sandbox.asaas.com/api/v3` (header `access_token`), read `/subscriptions/{id}/payments`, then DELETE the subscription and customer. Sandbox needs a valid-checksum CPF.

## Cancel = stop future renewals, keep access until end of paid period

- Cancelling a subscription must NOT deactivate the profile immediately. The lawyer keeps a paid grace period until the end of the already-paid cycle (paid 01/03 monthly -> visible through 31/03 even if cancelled 15/03). Two columns drive this: `subscriptions.canceledAt` + `accessUntil` (ISO yyyy-mm-dd text). On cancel: compute `accessUntil` = latest PAID payment dueDate + one cycle; if still in the future keep status `ativa` and stamp both fields, else `inativa`.
  - **Why:** Deleting the Asaas subscription only stops future charges; the customer already paid for the current cycle and has a right to it.
  - **How to apply:** The canceled-grace rule is AUTHORITATIVE and date-based, so it must be evaluated (a) at the very top of `deriveStatus`, before the persisted-status short-circuit; (b) in the public directory filter (`assinaturaVisivel`: `status='ativa' AND (canceledAt IS NULL OR accessUntil > today)`) so expiry is enforced at read time even if no GET has re-persisted the flip; (c) the webhook update must carry `isNull(canceledAt)` so a late Asaas event can never downgrade a canceled-but-still-paid row. On re-subscribe, reset `canceledAt`/`accessUntil`/`cancelReason` to null. If the payments fetch fails during cancel while status was `ativa`, fall back conservatively (nextDueDate or one cycle from today) rather than deactivating.

- Cancellation is a retention flow, not a one-click confirm: the panel runs a two-step survey (reason from 7 options + "Prefiro não informar", then a "retirar a visibilidade" retention prompt highlighting the ~7.500 visits/month value) before actually cancelling. The chosen reason travels as the optional `motivo` field on the `POST /assinatura/cancelar` body (`CancelSubscriptionInput`) and is persisted to `subscriptions.cancelReason`.
  - **Why:** Product wants to reduce churn and capture why lawyers leave.
  - **How to apply:** The cancel body is OPTIONAL (empty body must still cancel) so parse with `safeParse(req.body ?? {})`. Keep `additionalProperties:false` on the input schema. Persistence-only for now; no admin surface consumes `cancelReason` yet.
