---
name: Daily blog generator deployment model
description: Why the daily auto-post generator can't be a Scheduled Deployment in this same project, and how to actually ship it.
---

# Deploying the daily blog generator

The generator is a one-shot command (`generate-daily-posts`, bundled to
`dist/generate-daily-posts.mjs`) meant to run once per day, i.e. a Scheduled
Deployment.

**Platform constraint (the blocker):** a Replit *project* publishes ALL its
artifacts together as a SINGLE deployment. You cannot have an Autoscale/VM
deployment (the always-on web + API) AND a Scheduled deployment (the daily job)
in the same project at once — publishing applies to the whole project.

**How to actually ship the daily job (options):**
1. Separate project with a Scheduled Deployment that runs the generator command,
   pointed at the SAME production database (share the prod `DATABASE_URL`). This
   is the clean production pattern.
2. Keep one project (web+API on Autoscale/VM) and trigger generation from
   inside the running server — an in-process scheduler, or an authenticated
   endpoint hit by an external cron/uptime pinger.

**Partial-batch gotcha (observed in prod, July 2026):** daily runs stopped
after 3–5 of 14 posts with NO error anywhere (0 failed/rejected rows, all
requests 200 in prod logs, no further request ever arrived). Job timeout was
NOT the cause (it was 30 min). The original trigger.mjs did `process.exit(1)`
on the FIRST network/HTTP failure, so one transient connection error (e.g.
Autoscale recycling a keep-alive connection) killed the whole batch silently
from the app's perspective. Fix: trigger.mjs now retries with backoff (up to 4
consecutive failures, 3-min per-call timeout, immediate stop only on 401/403).
Each category takes ~40–47s → full batch ~10 min; keep despertador job timeout
≥20 min anyway. Diagnosis path: `blog_daily_runs` timestamps + prod request
logs — "requests stop arriving with no server error" = client-side abort.

**Testing without publishing:** run the command as a temporary console workflow
against the dev DB and watch `blog_daily_runs` + `blog_posts`; a full run does 1
post per macrocategoria (~14), skipping any category that already has a post
today (UTC). Scheduled Deployments also have a "Run Now" button in Publishing →
Schedule to trigger on demand once published.
