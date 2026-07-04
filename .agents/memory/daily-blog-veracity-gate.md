---
name: Daily auto-blog veracity gate
description: Why auto-published AI legal posts need deterministic reject layers on top of the model verdict, and the day-boundary rule for the daily job.
---

# Daily automatic blog veracity gate

Auto-published legal content (daily generator) must never trust the AI reviewer's
`aprovado` verdict alone. `verifyPost` applies TWO deterministic reject layers on
top of the model's overall verdict:

1. ANY legal check with `correto:false` forces reject.
2. If the post text contains concrete juridical claims (regex markers: lei/artigo/§/
   prazo/valores/percentuais, see `PADROES_JURIDICOS`) but the reviewer returned
   ZERO `checagens_legais`, force reject.

**Why:** requirement is "every legal data point must be EXPLICITLY verified" and
"na dúvida, reprova" (when in doubt, reject). A model can return `aprovado:true`
with an empty/incomplete check list, which would auto-publish unverified law. The
deterministic layers close that false-approval path. Rejected posts are DISCARDED
(never persisted, only logged to `blog_daily_runs`); this differs from the manual
/admin flow which persists a draft.

**How to apply:** if you add new auto-publish paths for AI legal content, route
them through `verifyPost` (or replicate both deterministic layers). Do not weaken
layer 2 into "warn only".

## Day boundary for the daily job

`runDate` (label) and the idempotency cutoff ("já criei post hoje?") must use the
SAME day reference or they can drift by one day and double-post / mislabel. Both
use UTC (`toISOString().slice(0,10)` and `Date.UTC(...)` midnight); the deploy
runs in UTC. The /admin metric endpoint dedups per `(runDate, category)` keeping
the most significant status (published>rejected>failed>skipped) so a same-day
re-run cannot inflate the daily count above 12.
