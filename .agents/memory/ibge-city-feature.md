---
name: IBGE city-of-practice feature
description: How city data is modeled/loaded across the psychologist profile and search, and the UF-disambiguation rule.
---

# Cidade de atuação (city of practice)

- Cities come from the public IBGE API (no auth): `GET /api/v1/localidades/estados/{UF}/municipios`. Loaded on demand per UF, cached in a plain in-memory object (NOT localStorage). Code in `src/lib/ibge.ts`; reusable input in `src/components/CityAutocomplete.tsx`.

## Rule: a city value must always carry its UF
**Why:** Brazilian city names repeat across states (e.g. multiple "Bom Jesus"). The search filter matches psicólogo cities by exact `"Nome, UF"` string, so a bare city name silently fails to match.
**How to apply:** `CityAutocomplete.onSelect` yields only the bare `nome`. The caller must re-attach the selected UF before storing/filtering (search does `setCidade(\`${nome}, ${estado}\`)`). The painel stores structured `{ nome, uf }`. Any new consumer of city data must pair name + UF, never the name alone.

## Rule: the estado field is a typeable autocomplete that stores bare UF
**Why:** User wanted to type+autocomplete the state, not just pick from a Select. But the stored estado must stay a bare UF because `CityAutocomplete` takes `uf={estado}` and the search URL/filter expect a UF.
**How to apply:** Use `src/components/StateAutocomplete.tsx` (controlled by `value`=UF, calls `onSelect(uf)`). It is the site-wide state picker (home, psicologos, painel-perfil). It displays "UF - Nome" but only ever emits the UF. It has no clear/empty option (parity with the old Select) and restores the selected label on blur, so a half-typed entry never desyncs from `value`. Restore-on-blur is via the Input `onBlur` (covers keyboard tab-away); option clicks use `onMouseDown`+`preventDefault` so they fire before blur.
