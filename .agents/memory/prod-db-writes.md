---
name: Production DB writes
description: Agent tooling cannot write to the production database; how prod data gets populated
---

Agent SQL against `environment: "production"` is READ-ONLY (writes are wrapped in a rolled-back transaction — they silently no-op, count stays 0). Publish migrates only the *schema*, never data.

**Why:** platform safety. Discovered when trying to copy the mined keyword queue from dev to prod: inserts "succeeded" but the table stayed empty.

**How to apply:** to populate prod data, have the deployed app do it itself — e.g. a token-gated internal endpoint (`/api/internal/blog/mine-next` pattern, same `BLOG_CRON_TOKEN` auth as generate-next) that writes from inside production. Call it repeatedly via curl until `remaining=0`; each call must fit autoscale request timeouts (~1–2 min per unit of work).
