---
name: Flaky auto-hiding banners in e2e tests
description: Why transient toast/banner UI causes spurious Playwright test failures and how to make it deterministic
---

Transient success banners that auto-dismiss after N seconds (`setTimeout(() => setShow(false), ...)`) cause flaky e2e failures when the test verifies with a non-retrying snapshot like `getByTestId(...).count()`. The check can land before the banner appears or after it has already hidden, reporting a real-looking "banner never appeared" bug even though the code is correct.

**Why:** `count()` does not auto-retry; combined with an artificial save delay (show at ~0.7s) and an auto-hide window, the visible interval is narrow and the snapshot timing is unpredictable.

**How to apply:** Prefer a persistent confirmation banner that stays until the user takes the next action (e.g. clear it inside the field `update()` handler), and tell the test agent to assert with auto-retrying `toBeVisible` rather than `count()`. This is both more reliable to test and better, more accessible UX than a brief toast.
