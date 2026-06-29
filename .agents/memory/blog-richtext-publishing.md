---
name: Blog richtext + draft publishing
description: How AI blog posts become drafts, get edited as richtext, and are published safely; key library and security constraints.
---

# Blog richtext editing, drafts, and safe publishing

## Draft-first flow
AI generation creates a DRAFT (`published:false`), never auto-publishes. The post goes
public only when the admin clicks "Publicar" (PATCH `/admin/blog/posts/{id}`).
**Why:** the user explicitly wants editorial review before anything is public.
**How to apply:** any new "generate content" path should default to unpublished; only the
explicit publish action flips `published` and stamps `publishedAt`.

## react-quill-new, not react-quill
Use `react-quill-new` for the richtext editor. Plain `react-quill` is unmaintained and
breaks on React 19 (the app is on React 19). Default export is the component; CSS at
`react-quill-new/dist/quill.snow.css`.

## bodyHtml is the XSS sink — sanitize server-side on write
Posts have both structured `body` (sections) and `bodyHtml` (richtext). Public `post.tsx`
renders `bodyHtml` via `dangerouslySetInnerHTML`, so it is a stored-XSS sink.
**Rule:** sanitize `bodyHtml` on every write with `sanitize-html` (strict allowlist of the
tags Quill can emit), NOT regex. Regex sanitizers miss unquoted attrs, encoded payloads,
svg/onload, etc.
**Why:** a code review flagged the original regex sanitizer as exploitable.
**How to apply:** the allowlist lives in `sanitizeHtml` in `api-server/src/lib/blog-generator.ts`.
If the editor toolbar gains a new format, add its tag to the allowlist or it gets discarded.

## publishedAt vs createdAt
"Publication date" (admin date filter, public post date) means `publishedAt`, not
`createdAt` — a draft created today and published next week must filter by next week.
`publishedAt` is null while draft, set on the false to true transition, kept on unpublish.
Date filters exclude drafts (no publishedAt) when a date range is active.
