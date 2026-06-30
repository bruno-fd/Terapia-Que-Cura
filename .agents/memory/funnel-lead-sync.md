---
name: Funnel lead sync
description: Why funnel lead upserts need server-side monotonic guards on step/completed
---

A multi-step funnel that best-effort upserts a lead on every step advance (and again on completion) sends requests that arrive out of order. An older `completed=false`/lower-`step` write can land after the completion write and overwrite it, so a finished registration gets re-classified as abandoned and triggers remarketing.

**Why:** Frontend fire-and-forget sync calls are uncoordinated; the network does not preserve order.

**How to apply:** In the upsert's `onConflictDoUpdate` set, make progress fields monotonic server-side: `step = greatest(table.step, incoming)` and `completed = table.completed OR incoming` (Drizzle `sql` template). Remarketing send must also gate on `completed`/`step` so it never fires for finished leads.
