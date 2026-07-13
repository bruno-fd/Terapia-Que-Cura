---
name: Daily-gen trigger endpoint concurrency
description: Why the internal daily-blog trigger endpoint needs a per-(day|category) Postgres advisory lock around the long AI generation.
---

# Daily blog trigger endpoint — concurrency safety

The internal endpoint that generates the daily blog (Option 3: Autoscale app +
separate Scheduled "despertador" project that calls it repeatedly, one
macrocategoria per call until `remaining` is 0) claims "spamming is cheap:
at most one batch/day" because a category is "pending today" only if it has no
`blog_daily_runs` row for today (UTC).

**Rule:** wrap the per-category generation in a Postgres session-level advisory
lock keyed by `hashtext("<runDate>|<category>")`, taken on a **dedicated
`pool.connect()` client** (lock + unlock on the same connection), *before* the
~40s generation. On lock-miss, skip to the next pending category. Recompute
`remaining` from the run table *after* processing.

**Why:** the pending check and the idempotency check (`blog_posts.createdAt >=
startOfToday`) are not atomic vs. the ~40s generation. Without the lock, two
concurrent calls (overlapping scheduled run + manual "Run Now", or a leaked
token being spammed) both read the same pending category and both generate —
duplicate posts and double-spent AI, breaking the once-per-day/cost guarantee.
A code review caught this; the first version had the race.

**How to apply:** any idempotent-per-period job exposed as a public (even
token-protected) endpoint where the work is long and the "already done" marker
is written only at the end needs an atomic claim. Advisory locks avoid a schema
migration (no unique constraint / status column needed). Don't use a
transaction-scoped lock — holding a txn open for the whole AI call ties up a
connection as idle-in-transaction; use session lock + explicit unlock in
`finally`.
