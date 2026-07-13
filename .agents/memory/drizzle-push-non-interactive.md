---
name: drizzle-kit push is unsafe in the agent shell
description: Why `pnpm --filter @workspace/db run push` fails/hangs here and how to apply a small additive column change instead.
---

# drizzle-kit push needs a TTY and applies ALL drift

`drizzle-kit push` (and `push-force`) diff the whole schema against the dev DB
and try to apply **every** pending difference at once — including unrelated
drift left over from other work. When a change looks data-destructive (e.g.
adding a unique constraint to a table that has rows) it opens an interactive
prompt, which throws `Interactive prompts require a TTY terminal` in the
non-interactive agent shell. `--force` does not skip that prompt.

**Why:** the repo can carry pre-existing schema drift (e.g. a pending
`subscriptions` unique constraint) unrelated to the change you're making.

**How to apply:** for a small **additive** change (new nullable columns),
skip `push` and run the DDL directly against the dev DB, e.g.
`psql "$DATABASE_URL" -c "ALTER TABLE t ADD COLUMN IF NOT EXISTS c text;"`.
Still update the Drizzle schema TS so the ORM types match. Reserve `push` for
when you intend to reconcile all drift and can answer its prompts.
