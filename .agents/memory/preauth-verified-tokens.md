---
name: Pre-auth verified-status tokens
description: Making a status established pre-auth (OAB verification in the cadastro funnel) unforgeable when persisted later via an authenticated write, plus the accepted replay tradeoff.
---

## Rule
When a trust status (e.g. "OAB verificada") is established in a pre-authentication step
(funnel in localStorage, before Clerk sign-in) but persisted later via an authenticated
write (PUT /perfil), do NOT let the client send the boolean/derived fields. Instead the
server mints a signed token at verification time and the client only replays that token;
the authenticated write re-verifies the signature and derives the trusted fields from the
token payload, never from client-chosen values.

**Why:** A first design let the client PUT `oabVerificada/oabSituacao/...` directly, so any
lawyer could forge "verified". Code review flagged this critical. Signing the result and
stripping the writable fields from the request schema closes the trivial forgery.

**How to apply:**
- Contract: the update input accepts only the opaque token + a least-privilege flag
  (e.g. `oabVerificacaoPendente`). It must NOT accept the trusted booleans/strings.
- Token: HMAC-SHA256 keyed by an existing app secret (SESSION_SECRET), short TTL,
  `timingSafeEqual`, base64url payload. If the secret is missing, BOTH sign and verify
  return null (secure default: never marks verified).
- On the authenticated write, additionally check the token binds to the record being
  written (here: OAB number + seccional parsed from the stored `OAB/UF 123456` string).

## Accepted residual (replay across accounts)
Because verification is pre-auth, the token cannot be bound to `req.userId` at mint time.
So a token is replayable by anyone who already knows a real lawyer's CPF+name+OAB (all of
which must pass the live registry check). Impersonation is limited because the stamped
confirmed-name comes from the token (the real lawyer's name), not the attacker's input.
Fully closing it needs a stateful single-use nonce store; deferred as out of scope for the
pre-auth funnel architecture. Documented in replit.md "Architecture decisions".
