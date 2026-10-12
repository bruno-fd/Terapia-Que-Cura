---
name: Similaridade de título engana em blog formulaico
description: Por que pg_trgm sobre títulos não serve como detector de duplicata quando os títulos seguem moldes repetidos.
---

Neste blog os títulos seguem moldes ("X tem cura? O que esperar do tratamento",
"X: o que é e como reconhecer", "X: sintomas que você precisa conhecer"). Trigrama
sobre o título inteiro mede então a **fórmula**, não o tema: doenças distintas
colidem alto ("Alcoolismo tem cura?" × "Bulimia tem cura?" ≈ 0,65; "Bipolar Tipo 1"
× "Tipo 2" ≈ 0,92), enquanto duplicatas reais com títulos redigidos de formas
diferentes podem passar batido.

**Why:** medido contra o corpus real de produção, um limiar lexical de 0,55 marcaria
72 de 207 posts como duplicados. Um gate assim rejeita conteúdo legítimo e registra
"rejected" — falha silenciosa, que parece proteção funcionando.

**How to apply:** para deduplicação, compare a **entidade/busca-alvo** (ou remova o
molde antes do trigrama), e trate a camada lexical isolada como aviso, não como
bloqueio. Sempre calibre qualquer limiar novo simulando contra o corpus de produção
inteiro antes de ligar — o corpus de dev é pequeno demais para revelar o efeito.
