---
name: Asaas dev is live billing
description: Why plan amounts in api-server PLANS must always be the real production prices, even in development.
---

# Asaas development uses the REAL API

`ASAAS_BASE_URL` points at `https://api.asaas.com/v3` in BOTH development and production (the sandbox was intentionally removed from dev). So any charge created while testing the cadastro/checkout flow is a real customer and a real invoice.

**The trap:** it is tempting to temporarily lower a plan price (e.g. `PLANS.mensal.valueCents` to the R$5,00 Asaas minimum) to test real card charges cheaply. This was done once and nearly shipped — the frontend still advertised R$49,90 while the backend would have charged R$5,00.

**Rule:** the amounts in `artifacts/api-server/src/routes/subscription.ts` `PLANS` are the source of truth for what customers are billed and MUST always equal the advertised prices (Mensal R$49,90 = 4990, Anual R$478,80 = 47880). If you lower one for a live test, restore it in the same session and re-verify the frontend `PLANOS` display matches before completing.

**Why:** there is no sandbox safety net in dev; a wrong constant charges real money and desyncs from the price shown to the user.
