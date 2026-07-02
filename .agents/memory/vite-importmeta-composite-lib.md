---
name: Vite import.meta.env in composite libs
description: Why a shared lib that uses import.meta.env needs its own ambient type declaration
---

A shared `lib/*` package that is consumed by a Vite artifact but uses
`import.meta.env` (e.g. `import.meta.env.BASE_URL`) will FAIL `pnpm run typecheck:libs`
with `TS2339: Property 'env' does not exist on type 'ImportMeta'`.

**Why:** composite libs are typechecked by `tsc --build` with `tsconfig.base.json`'s
`"types": []`, so they never pick up `vite/client` (which the Vite app itself has).
The lib does not depend on `vite`.

**How to apply:** add a dependency-free ambient declaration file inside the lib's
`src/` (included by `"include": ["src"]`), e.g.:

```ts
interface ImportMeta {
  readonly env: { readonly BASE_URL: string };
}
```

Do NOT add `vite` as a dependency just for the types. Seen with `lib/replit-auth-web`
(`use-auth.ts` builds the login redirect base from `import.meta.env.BASE_URL`).
