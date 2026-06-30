---
name: Clerk embedded SignUp
description: How to embed Clerk SignUp inline on a page (no separate route) in @clerk/react 6.11.1
---

`@clerk/react` 6.11.1 `SignUpProps.routing` only accepts `"path" | "hash"` (NOT `"virtual"`, despite some docs). To render `<SignUp>` inline inside a multi-step page without it taking over the URL path, use `routing="hash"`. It keeps the user on the current path and uses the URL hash for its internal sub-steps.

**Why:** The new signals-based `useSignUp()` (imperative `signUp.create/.password/.verifications`) shape was hard to type-verify and fragile; embedding the prebuilt `<SignUp>` is more robust and matches how App.tsx already renders Clerk components.

**How to apply:** Pass `routing="hash"`, plus `fallbackRedirectUrl`/`forceRedirectUrl` set to the current page path (with BASE_URL prefix), and `initialValues={{ emailAddress }}` to prefill. Detect post-signup with `useUser().isSignedIn` and conditionally swap to the next sub-step. After signup Clerk redirects to the page, which remounts and restores funnel state from localStorage.
