---
name: Blog writer/reviewer prompt consistency
description: The daily blog generator's writer, reviewer, and corrector prompts must not contradict each other, or the correction loop never converges.
---

# Blog writer/reviewer prompt consistency

The daily blog generator (`artifacts/api-server/src/lib/blog-generator.ts`) uses three AI passes sharing overlapping rules: writer (`EDITORIAL_RULES` + `generatePost`), reviewer (`REVIEWER_RULES` + `verifyPost`), and corrector (`correctPost`). The generator loops generate → verify → correct → re-verify up to 2 rounds.

**Rule:** Any phrasing the writer is INSTRUCTED to produce must be phrasing the reviewer explicitly ACCEPTS. If the reviewer flags language the writer is required to use, the correction loop can never converge: the corrector re-emits the mandated phrasing, the reviewer rejects it again, and legitimate posts get discarded after exhausting the rounds.

**Why:** A real occurrence: the OAB closing template mandates the conditional "pode ser que seus direitos não tenham sido respeitados", but the reviewer read any mention of "direitos não respeitados" as "afirma como fato que o leitor foi lesado" and rejected it. Categories were rejected after 2 wasted correction rounds. After the reviewer prompt was updated to explicitly PERMIT conditional closings ("pode ser que", "em muitos casos", "talvez", "pode"), the same content published directly with 0 corrections.

**How to apply:** When editing any of the three prompts, re-read the other two for contradictions. The conditional-vs-affirmative distinction in the OAB closing is the most fragile point. Genuine legal-fact disagreements (e.g. a disputed prescription prazo) are the correct kind of rejection to keep, the safety net (`algumDadoIncorreto`/`faltaChecagem` in `verifyPost`) should still discard those.
