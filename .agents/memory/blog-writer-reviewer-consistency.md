---
name: Blog writer/reviewer prompt consistency
description: The daily blog generator's writer, reviewer, and corrector prompts must not contradict each other, or the correction loop never converges.
---

# Blog writer/reviewer prompt consistency

The daily blog generator (`artifacts/api-server/src/lib/blog-generator.ts`) uses three AI passes sharing overlapping rules: writer (`EDITORIAL_RULES` + `generatePost`), reviewer (`REVIEWER_RULES` + `verifyPost`), and corrector (`correctPost`). The generator loops generate → verify → correct → re-verify up to 2 rounds.

**Rule:** Any phrasing the writer is INSTRUCTED to produce must be phrasing the reviewer explicitly ACCEPTS. If the reviewer flags language the writer is required to use, the correction loop can never converge: the corrector re-emits the mandated phrasing, the reviewer rejects it again, and legitimate posts get discarded after exhausting the rounds.

**Why:** A real occurrence (from the original legal-domain version of this rule, before the OAB→CFP migration): the closing template mandated a conditional phrase, but the reviewer read any mention of the underlying claim as an affirmative statement and rejected it. Categories were rejected after 2 wasted correction rounds. After the reviewer prompt was updated to explicitly PERMIT conditional closings ("pode ser que", "em muitos casos", "talvez", "pode"), the same content published directly with 0 corrections. The current CFP-domain closing template ("Se você se identificou com essa situação, pode ser importante conversar com um psicólogo.") is exactly this kind of mandated conditional phrasing, so the same fragility applies.

**How to apply:** When editing any of the three prompts, re-read the other two for contradictions. The conditional-vs-affirmative distinction in the CFP closing is the most fragile point (don't let the reviewer treat "pode ser importante conversar com um psicólogo" as "afirma que o leitor tem uma condição"). Genuine technical-fact disagreements (e.g. a disputed prevalence statistic) are the correct kind of rejection to keep; the safety net (`algumDadoIncorreto`/`faltaChecagem`/`faltaOrientacaoDeRisco` in `verifyPost`) should still discard those, and the CVV(188)-safety-line requirement for risk topics (ideação suicida, automutilação, abuso) must never be relaxed by prompt edits.
