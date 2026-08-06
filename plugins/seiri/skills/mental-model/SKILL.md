---
name: mental-model
user-invocable: true
disable-model-invocation: true
description: '[seiri:mental-model] Build a model of how the code actually behaves, then attack it — only the claims that survived the code, each marked by how well it is backed. Trigger: "build a mental model", "멘탈모델 만들어줘"'
argument-hint: '<the question the model must answer>'
version: '0.3.0'
complexity: moderate
plugin: seiri
---

# mental-model — a model you tried to break

You were invoked by the user, so ask what the model is for. A model is not a summary: it predicts, and the code can refute it. Writing one you never attacked is the failure this skill exists to prevent — a plausible model reads exactly like a correct one.

## Workflow

**1. Name the question, and ask now.** State what the model must answer, and what you would do differently depending on the answer. A model with no question grows until it retells the code. Ask everything you need here — step 2 enters a discipline that does not stop to ask.

**2. Collect facts in two layers, not narrative.** Load `/seiri:trace-structure` for the paths this question touches. **Deep** — the surrounding system the question sits in, kept as skippable background. **Narrow** — the paths the question touches, where a fact carries `file:line`; what you did not read is not one. A comment, doc, or commit message you read is a fact about intent, not behaviour (`references/claims.md`).

**3. Hypothesize the essence, then split it.** Before any list of claims, state the model's core in one piece, with one concrete toy input: "if this model is right, input X takes path Y." Then split it into claims that could be wrong — each says what must hold, and what breaks if it does not. The essence enters the model only through its split claims; the toy input becomes step 4's cheapest weapon. Cut every sentence that predicts nothing — that is summary, and summary cannot be checked. Forms and the three layers are in `references/claims.md`.

**4. Attack each claim.** Go looking for the code that contradicts it: the branch that skips it, the caller that violates it, the state where it stops holding — and run the simulation attack: walk the step-3 input end-to-end through the real paths (`references/breaking.md`). An unattacked claim does not enter the model.

**5. Report what survived, ordered for understanding.** Background first, essence second, per-layer claims last. Each claim carries `traced` (read it, cite `file:line`), `inferred` (follows from traced facts, not read directly), or `assumed` (neither — written down so it can be attacked later). Refuted claims stay in the report, with what killed them.

**6. Close the loop.** Answer the step-1 question from surviving claims only. If they cannot answer it, the model is not done: name the wall still dark and return to step 2 — a model that survived every attack yet answers nothing is a tour, not a model.

## Rules

- Surviving an attack is not proof. It means not broken yet; the mark says how hard you tried.
- One claim, one layer. A claim spanning structure, behaviour, and domain at once cannot be attacked — a counterexample against one half leaves the other standing.
- Do not modify files. This skill produces a model.
- The model lives in this session only. Say so when handing it over, and let the user decide what is worth keeping.
- Hand off: a model that exposed a defect goes to `/seiri:trace-cause`; one that shapes a change goes to `/seiri:brainstorm`; explaining a change to a reader is `/seiri:trace-change`'s moment.
