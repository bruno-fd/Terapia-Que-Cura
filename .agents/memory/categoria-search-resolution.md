---
name: Free-text categoria search resolution
description: How the citizen category search resolves typed text, and the duplicate-subcategory ambiguity to watch for.
---

# Free-text categoria search (CategoriaAutocomplete)

The citizen category search is a free-text autocomplete over BOTH levels (12 macrocategorias + subcategorias). The typed text (`queryCategoria`) is the single source of truth: `handleSearch` resolves it at search time via `buscarCategorias(q)[0]`, NOT from select-only parent state.

**Why:** an earlier version stored the resolved macro/sub only on `onSelect`, so typing free text and clicking "Buscar" without picking a suggestion applied stale/empty filters. Resolving the visible text on search keeps "what you see is what you search".

**How to apply:** any new consumer of `CategoriaAutocomplete` must wire `value` + `onQueryChange` to one raw-text state and resolve it with `buscarCategorias` at submit time. Do not reintroduce a select-only categoria/subcategoria pair as the search source.

## Duplicate subcategory names are ambiguous
Some subcategoria names appear under more than one macro (e.g. "Violência Doméstica" is in both "Família" and "Crimes e Defesa Criminal"). `buscarCategorias` returns matches in CATEGORIAS order, so text-only resolution always picks the first macro. The sub-name filter (`especialistas`) is unaffected (same name), but the "geral" macro layer resolves to whichever macro comes first. If disambiguation ever matters, carry the chosen macro slug through selection instead of re-resolving text.
