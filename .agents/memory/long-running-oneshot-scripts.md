---
name: Long-running one-shot scripts in Replit
description: Why ad-hoc background processes die and how to run a multi-minute one-shot script to completion
---

Ad-hoc background processes started from the bash tool (even with `setsid ... & disown < /dev/null`) do NOT reliably survive in this environment. The container reaps non-workflow processes after the launching tool call ends, so a long one-shot script gets killed partway and its work never finishes.

**Why:** only Replit *workflows* are kept alive in the background across agent turns. Ad-hoc PIDs are transient. Symptom seen: the daily blog generator would log its startup line, then vanish with zero DB rows written, repeatedly.

**How to apply:** to run a multi-minute one-shot script (longer than the bash tool's 120s cap), register it as a temporary `console` workflow via `configureWorkflow({name, command, outputType:"console", autoStart:true})`, poll progress from the DB (the source of truth) since pino buffers stdout, then `removeWorkflow` when done so it doesn't auto-restart on package installs.
