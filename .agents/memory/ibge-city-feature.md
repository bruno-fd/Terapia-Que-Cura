---
name: IBGE city-of-practice feature
description: How city data is modeled/loaded across the lawyer profile and search, and the UF-disambiguation rule.
---

# Cidade de atuação (city of practice)

- Cities come from the public IBGE API (no auth): `GET /api/v1/localidades/estados/{UF}/municipios`. Loaded on demand per UF, cached in a plain in-memory object (NOT localStorage). Code in `src/lib/ibge.ts`; reusable input in `src/components/CityAutocomplete.tsx`.

## Rule: a city value must always carry its UF
**Why:** Brazilian city names repeat across states (e.g. multiple "Bom Jesus"). The search filter matches lawyer cities by exact `"Nome, UF"` string, so a bare city name silently fails to match.
**How to apply:** `CityAutocomplete.onSelect` yields only the bare `nome`. The caller must re-attach the selected UF before storing/filtering (search does `setCidade(\`${nome}, ${estado}\`)`). The painel stores structured `{ nome, uf }`. Any new consumer of city data must pair name + UF, never the name alone.
