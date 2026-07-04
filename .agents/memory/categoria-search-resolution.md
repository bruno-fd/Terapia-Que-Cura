---
name: Free-text categoria search resolution
description: Invariants for the citizen category search over both category levels, and the duplicate-subcategory ambiguity to watch for.
---

# Free-text categoria search (both levels)

The citizen category search is a free-text autocomplete over BOTH levels (macrocategorias + subcategorias). The visible field is the source of truth: search must resolve what the user sees, whether or not they clicked a suggestion.

**Why:** an earlier version stored the resolved macro/sub only on select, so typing free text and searching without picking a suggestion applied stale/empty filters. "What you see is what you search" is the required behavior.

**How to apply:** any consumer must wire the field to one raw-text state, resolve at submit time, AND also track the last picked suggestion so an explicit selection wins over free-text re-resolution. Editing the text must invalidate that stored selection.

## Duplicate subcategory names are ambiguous
Some subcategoria names exist under more than one macro (e.g. "Violência Doméstica" is under both "Família" and "Crimes e Defesa Criminal"). Free-text resolution always picks the first macro in CATEGORIAS order, which can be the wrong one.

**Rule:** when the user explicitly selected a suggestion, carry that selection's exact macro through to the search instead of re-resolving the text. Only fall back to first-match resolution when there is no active selection. Without this, an ambiguous sub silently resolves to the wrong macro layer in results.
