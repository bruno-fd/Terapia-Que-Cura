---
name: Tailwind v4 numbered color tokens
description: Why numbered color utilities (bg-primary-500, text-accent-600) silently render wrong in Tailwind v4 unless registered in @theme
---

In Tailwind v4, numbered color utility classes like `bg-primary-500`, `text-accent-600`, `border-primary-200`, `bg-primary-50` only generate CSS if a matching token (`--color-primary-500`, `--color-accent-600`, ...) exists in the `@theme inline` block of the CSS entry (e.g. `src/index.css`). Defining the hex values only as `:root` custom properties is NOT enough.

**Symptom:** classes appear in the markup but the rendered element has no color — e.g. an orange button renders white-on-white (invisible), tinted backgrounds vanish, accent lines fall back to a dark default. No build error, no console error — it fails silently.

**Why:** Tailwind v4 generates utilities from `@theme` tokens, not from arbitrary CSS vars. A class with no backing token is dropped during generation.

**How to apply:** When a design uses a numbered color scale (50..900), register every step you use in `@theme inline` (`--color-<name>-<step>`). If you instead use single-name tokens, stick to `bg-primary` / `text-accent` (no number). Arbitrary values like `bg-[#E86100]` always work regardless. When colors render as white/blank/default despite correct-looking classes, check the `@theme` block first.
