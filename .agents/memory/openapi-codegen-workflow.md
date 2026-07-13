---
name: OpenAPI → zod/client codegen workflow
description: How API request/response types are generated and the exact command to regenerate them after a schema change.
---

# OpenAPI codegen chain

The API contract is a hand-written OpenAPI spec; all zod schemas and the React
query client are generated from it — never edit the generated files by hand.

- Source of truth: `lib/api-spec/openapi.yaml`
- Generator config: `lib/api-spec/orval.config.ts` (orval)
- Regenerate command: `pnpm --filter @workspace/api-spec run codegen`
  - Runs `orval` then `pnpm -w run typecheck:libs` (so it also typechecks all libs).
- Outputs: `lib/api-zod` (zod schemas like `ListPublishedPostsResponse`) and
  `lib/api-client-react` (generated React Query client).

**How to apply:** any new/changed request or response field must flow in this
order: DB schema → `openapi.yaml` → run codegen → then consume the new field in
the frontend. The public list route does `db.select()` then
`SomeResponse.parse(...)`, so a DB column that isn't added to `openapi.yaml`
will be stripped/rejected by the zod parse.
