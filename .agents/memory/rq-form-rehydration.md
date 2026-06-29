---
name: React Query form rehydration
description: Pattern for seeding a controlled form from a React Query result without clobbering user edits or stranding stale data on account switch.
---

# Rehydrate a form by data-reference identity, not a boolean flag

When seeding a controlled form (e.g. an editable profile) from a React Query
`useQuery` result, do NOT gate the seeding on a one-time `hydrated` boolean.

Instead track the last seeded data object in a ref and re-seed whenever the
query data reference changes:

```ts
const { data: loaded, isLoading, isError, refetch } = useGetX();
const hydratedFrom = useRef<typeof loaded | null>(null);
useEffect(() => {
  if (loaded && hydratedFrom.current !== loaded) {
    setForm({ ...loaded });
    hydratedFrom.current = loaded;
  }
}, [loaded]);
const ready = loaded != null && hydratedFrom.current === loaded;
// guard: if (isError && !loaded) show retry; if (isLoading || !ready) show spinner;
```

**Why:**
- React Query uses structural sharing: a refetch returning deep-equal data
  yields the SAME object reference, so a window-focus refetch will NOT re-seed
  and clobber in-progress edits.
- When the authenticated user/account changes and the query cache is cleared
  (e.g. Clerk sign-in/out invalidator calling `queryClient.clear()`), the next
  fetch produces a NEW reference, so the form correctly resyncs to the new
  user's data instead of showing the previous user's values.
- A boolean `hydrated` guard breaks both: it never re-seeds after the first
  load, and combined with `if (isLoading || !hydrated)` it leaves an infinite
  spinner on initial fetch error (data never arrives, `hydrated` never flips).

**How to apply:** Use for any DASHBOARD/account-scoped form fed by a React
Query hook. Always also handle `isError && !loaded` with a retry button so a
failed initial load is recoverable rather than a permanent spinner.
