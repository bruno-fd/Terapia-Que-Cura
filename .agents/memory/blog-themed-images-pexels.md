---
name: Blog themed cover images via Pexels
description: Why blog covers use runtime Pexels stock photos and the safety gates around the AI-chosen search query.
---

# Themed blog covers (Pexels, runtime)

Blog posts get a royalty-free cover image fetched at creation time from the
Pexels API (free tier), not AI-generated.

**Why runtime stock, not agent image tools:** the daily generator runs
unattended on a Scheduled Deployment, so the agent's imageSearch callback is
not available at runtime — a real runtime API is required. Pexels is free,
allows commercial use + hotlinking, and avoids the cost/deformed-face risk of
AI image generation on sensitive mental-health topics.

**How it works:** the post-writer model outputs an English `imageQuery`; the
server queries Pexels and stores url/alt/credit/creditUrl. Image fetch lives in
`persistGeneratedPost`, the shared insert path, so both the daily auto-gen and
the manual `/admin` flow get a cover automatically. Missing key / no result /
error all return null and the post still publishes (image is non-critical).

**Safety gates (don't remove):** prompt guidance alone is not enough for
sensitive topics. There is a deterministic blocklist (`imageQuerySegura` /
`resolverQueryDeImagem`) that discards a literal/graphic query and falls back to
a curated safe per-category query, plus `urlHttpsPexels` that only trusts
https `*.pexels.com` URLs before persisting/rendering (defense against URL
injection in href/src).
