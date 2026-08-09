---
name: Guarda de subtema precisa de teto de similaridade
description: Heurística de "subconjunto = subtema" cria falso negativo em duplicata real; medir sempre contra o corpus antes de subir.
---

Regra "entidade A ⊆ entidade B com token extra significativo ⇒ temas distintos"
resolve subtema legítimo ("estresse pós-traumático" x "…no trabalho", "…para cirurgia"
x "…de catarata", "geral" x "tipo 1"), mas **libera duplicata real** sempre que a
normalização deixa resíduo de frase (pronomes, verbos, "desse ciclo", "quando pode
ajudar sua família"): o resíduo é lido como qualificador.

Lista de stopwords não resolve sozinha — um único token residual ("desse") já dispara.
O que funcionou nos dados reais: aplicar a guarda de subtema **apenas abaixo de um teto**
de similaridade (~0,85 no trigrama), isentar do teto a guarda de variante numérica, e
**nunca** aplicar subtema na camada semântica (cosseno alto = mesmo conteúdo,
independentemente de a entidade ser subconjunto).

**Why:** com a guarda sem teto, duas duplicatas reais escaparam (uma lexical 0,868,
uma semântica 0,928) enquanto todos os subtemas legítimos ficavam entre 0,72 e 0,80.

**How to apply:** antes de subir qualquer recalibragem desse gate, simular contra o
corpus real (entidades geradas pelo código de verdade via bundle esbuild + pg_trgm em
tabela scratch no dev) e classificar os pares em duplicata / intenção / subtema. Custa
minutos e evita um ciclo de deploy às cegas.
