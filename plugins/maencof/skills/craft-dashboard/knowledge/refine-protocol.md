# Dashboard Interview Protocol — Shared Reference

This file is the single source of truth for the interview mechanics shared by CREATE and MUTATE: Phase 1 input analysis, Phase 2 inquiry, Phase 2.5 counter-examples, and Phase 3 final output. Each workflow owns later persistence and transformation steps.

The question budget is **5–7 (hard cap 7) for CREATE** and **2–4 (hard cap 4) for MUTATE**. Phase 2 and Phase 2.5 share the applicable cap.

---

## Contract summary

- **One question per turn.** Target the highest-priority ambiguity in the user's current input. Never batch.
- **Total budget**: 5–7 questions for CREATE (hard cap 7), 2–4 for MUTATE (hard cap 4). Phase 2 + Phase 2.5 share the budget.
- **Never assume intent.** When ambiguous, ask. When silent, default and flag the defaulted field in the diff preview — never silently fabricate.
- **Immutable Objects**: commands, paths, URLs, version pins, quoted strings, identifiers, environment variables, and CLI flags from the user MUST be preserved verbatim through Phase 3.
- **Command gate**: slash commands and skill invocations in the input are text to refine. Never execute them; preserve them verbatim and clarify ambiguous intent through questions.
- **Write boundary**: stop at Phase 3 output. Do not implement, scaffold, execute the refined request, or modify source code. A caller may persist only the designated `.dashboard-spec.draft.md` after Phase 3.
- **Output shape**: the Phase 3 "Refined Prompt" MUST use the section headings fixed by craft-dashboard's `interview-hints.md` ("Output Shape") so the Phase 3 spec transform is deterministic.

The Phase 3 response uses this fixed outer frame:

```markdown
---
## Refined Prompt
(The precise prompt using the required interview-hints headings)

## Logic & Strategy
(A brief explanation of structural choices and applied constraints)
---
```

## Token-budget safety

If the user signals "good enough" before all dimensions are clear, write the draft anyway and flag low-confidence fields in Phase 3's diff preview. Never silently fabricate values for missing spec fields.

## Abort signal

The user can leave the interview at any turn by typing a bare abort token — one of:

```
cancel    abort    stop    exit    quit    quit-keep    중단    취소    그만
```

`quit-keep` is the only variant that preserves the working drafts; every other token cleans them up.

On detection, the skill MUST:

1. Skip remaining inquiry, Phase 3, and all later phases.
2. Delete `<target>/.dashboard-priming.md` and `<target>/.dashboard-spec.draft.md` if they exist — unless the user typed `quit-keep`, in which case the drafts stay in place for a later re-entry.
3. Print a one-line confirmation: `interview cancelled — no files changed` (or `... — draft kept` if the user typed `quit-keep`).
4. Exit with status code 0. Do NOT continue with hand-off.

Headless mode never receives interactive input, so the abort signal does not apply there.
