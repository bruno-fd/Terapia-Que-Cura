---
name: Cadastro funnel skip-step + redirect param
description: How the lawyer-registration funnel skips the plan step when a plan is pre-chosen, and the redirect gotcha that resets it.
---

The lawyer registration is two routes: a landing at `/cadastro` (plan cards + CTAs) and the
progressive funnel at `/cadastro/fluxo`. Landing plan buttons navigate with `?plano=mensal|anual`.

The funnel reads `?plano=` once (useState initializer) into `planoViaUrl`; `skipPlano = planoViaUrl !== null`.
When skipping, the step order drops Etapa 3 (plan choice): `ordem = [1,2,4,5]`, progress shows 3 steps,
and `goTo` guards any landing on step 3 -> 4. "Editar plano" in the order summary goes back to the
landing when plano came from the URL, else to step 3.

**Why / gotcha:** skip mode is derived ONLY from the URL query, and Clerk's embedded `<SignUp>`
(`forceRedirectUrl`/`fallbackRedirectUrl`) remounts the funnel after signup. If that redirect drops
`?plano=`, `skipPlano` flips to false on the remount and the user silently loses the skipped-step
semantics. Fix: StepConta receives a `planoRedirect: Plano | null` prop and builds the redirect as
`/cadastro/fluxo?plano=<plano>` ONLY when the plan came from the landing (null otherwise, so a user
who picked the plan in Etapa 3 still edits back to Etapa 3, not the landing).

**How to apply:** any external redirect that re-enters a funnel whose mode is encoded in the URL must
preserve those params, or the mode resets on remount. Prefer threading the origin value down rather
than guessing from saved state.
