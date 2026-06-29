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
