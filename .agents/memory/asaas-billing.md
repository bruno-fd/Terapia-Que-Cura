---
name: Asaas recurring card billing
description: How Asaas recurring credit-card subscriptions and env key scoping work in this project
---

# Asaas recurring credit-card subscriptions

- To charge a recurring credit card, create the subscription with `billingType: "CREDIT_CARD"` and send NO card data. Asaas returns a hosted invoice (`invoiceUrl`) where the customer enters the card. The card is tokenized and every subsequent cycle auto-charges. Verified live in sandbox: the first payment is PENDING, billingType CREDIT_CARD, with a hosted `invoiceUrl`.
  - **Why:** `billingType: "UNDEFINED"` instead lets the customer pick PIX/boleto/card, which is NOT a recurring card charge. Use CREDIT_CARD for real recurring billing.

- Env / key scoping: Replit secrets are global (not env-scoped), so the sandbox vs prod key is selected by the env-scoped `ASAAS_BASE_URL`. As of the sandbox-removal request, BOTH `[userenv.development]` and `[userenv.production]` set `ASAAS_BASE_URL=https://api.asaas.com/v3` (real API); the code default also fell back from sandbox to the real API. When base URL is production, the client uses `ASAAS_API_KEY_PROD`; otherwise (sandbox) `ASAAS_API_KEY`.
  - **How to apply:** Development now hits the REAL Asaas API, so testing in the dev preview DOES create real customers/subscriptions/charges. This was an explicit request because sandbox testing was too hard. To go back to safe testing, repoint `[userenv.development] ASAAS_BASE_URL` to `https://sandbox.asaas.com/api/v3`.

- Both the sandbox key and the prod key authenticate against the SAME real Asaas account (confirmed via `/myAccount`). Sandbox is just the test environment of that account.

- To live-verify without leaving test data: create a customer + CREDIT_CARD subscription on `https://sandbox.asaas.com/api/v3` (header `access_token`), read `/subscriptions/{id}/payments`, then DELETE the subscription and customer. Sandbox needs a valid-checksum CPF.
