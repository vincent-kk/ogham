---
name: mental-model
user-invocable: true
disable-model-invocation: true
description: '[seiri:mental-model] Build a model of how the code actually behaves, then attack it — only the claims that survived the code, each marked by how well it is backed. Trigger: "build a mental model", "멘탈모델 만들어줘"'
argument-hint: '<the question the model must answer>'
version: '0.2.0'
complexity: moderate
plugin: seiri
---

# mental-model — a model you tried to break

You were invoked by the user, so ask what the model is for. A model is not a summary: it predicts, and the code can refute it. Writing one you never attacked is the failure this skill exists to prevent — a plausible model reads exactly like a correct one.

## Workflow

**1. Name the question, and ask now.** State what the model must answer, and what you would do differently depending on the answer. A model with no question grows until it retells the code. Ask everything you need here — step 2 enters a discipline that does not stop to ask.

**2. Collect facts, not narrative.** Load `/seiri:trace-structure` for the paths this question touches. A fact carries `file:line`; what you did not read is not one. A comment, doc, or commit message you read is a fact about intent, not behaviour (`references/claims.md`).

**3. Write claims that could be wrong.** A claim says what must hold, and what breaks if it does not. Cut every sentence that predicts nothing — that is summary, and summary cannot be checked. Forms and the three layers are in `references/claims.md`.

**4. Attack each claim.** Go looking for the code that contradicts it: the branch that skips it, the caller that violates it, the state where it stops holding. An unattacked claim does not enter the model. Where the counterexample hides, per layer, is in `references/breaking.md`.

**5. Report what survived, marked.** Each claim carries `traced` (read it, cite `file:line`), `inferred` (follows from traced facts, not read directly), or `assumed` (neither — written down so it can be attacked later). Refuted claims stay in the report, with what killed them.

## Rules

- Surviving an attack is not proof. It means not broken yet; the mark says how hard you tried.
- One claim, one layer. A claim spanning structure, behaviour, and domain at once cannot be attacked — a counterexample against one half leaves the other standing.
- Do not modify files. This skill produces a model.
- The model lives in this session only. Say so when handing it over, and let the user decide what is worth keeping.
- Hand off: a model that exposed a defect goes to `/seiri:trace-cause`; one that shapes a change goes to `/seiri:brainstorm`.
