---
name: Pre-auth verified-status tokens
description: Making a status established pre-auth (CRP verification in the cadastro funnel) unforgeable when persisted later via an authenticated write, plus the accepted replay tradeoff.
---

## Rule
When a trust status (e.g. "CRP verificado") is established in a pre-authentication step
(funnel in localStorage, before Clerk sign-in) but persisted later via an authenticated
write (PUT /perfil), do NOT let the client send the boolean/derived fields. Instead the
server mints a signed token at verification time and the client only replays that token;
the authenticated write re-verifies the signature and derives the trusted fields from the
token payload, never from client-chosen values.

**Why:** A first design let the client PUT `crpVerificada/crpSituacao/...` directly, so any
psicólogo could forge "verified". Code review flagged this critical. Signing the result and
stripping the writable fields from the request schema closes the trivial forgery.

**How to apply:**
- Contract: the update input accepts only the opaque token + a least-privilege flag
  (e.g. `crpVerificacaoPendente`). It must NOT accept the trusted booleans/strings.
- Token: HMAC-SHA256 keyed by an existing app secret (SESSION_SECRET), short TTL,
  `timingSafeEqual`, base64url payload. If the secret is missing, BOTH sign and verify
  return null (secure default: never marks verified).
- On the authenticated write, additionally check the token binds to the record being
  written (here: CRP number + região parsed from the stored `CRP UF/123456` string).

NOTE: as of the lawyer→psychologist rebrand, the actual verification call in
`lib/oab.ts`/`routes/oab.ts` still targets the OAB webservice and is pending migration to
a CRP-equivalent provider (see replit.md "CRP verification"). The token/signing mechanism
described here (field names already renamed to `crp*`) is ready for that migration; only
the external call and its response mapping need to change.

## Accepted residual (replay across accounts)
Because verification is pre-auth, the token cannot be bound to `req.userId` at mint time.
So a token is replayable by anyone who already knows a real psicólogo's CPF+name+CRP (all
of which must pass the live registry check). Impersonation is limited because the stamped
confirmed-name comes from the token (the real psicólogo's name), not the attacker's input.
Fully closing it needs a stateful single-use nonce store; deferred as out of scope for the
pre-auth funnel architecture. Documented in replit.md "Architecture decisions".
