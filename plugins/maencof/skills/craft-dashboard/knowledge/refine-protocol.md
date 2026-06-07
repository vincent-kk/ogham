# Inlined refine Contract — Shared Reference

Both CREATE and MUTATE workflows adopt `/maencof:refine`'s 5-phase protocol
in-session (slash-skill chaining is unsupported inside an active skill). This
file is the single source of truth for the protocol summary; the workflows
reference it instead of duplicating the contract.

Authoritative source: `$CLAUDE_PLUGIN_ROOT/skills/refine/SKILL.md`. Read it at
Phase 2 step 1 for the interview _mechanics_ (one-question loop, Socratic
Elenchus, immutable-object preservation, Phase 3 stop rule); the summary below
mirrors those — when in doubt about mechanics, defer to the authoritative
SKILL.md.

**Exception — the question budget is owned by craft-dashboard, not refine.**
refine's general budget is "5–8 turns"; craft-dashboard deliberately tightens it
to **5–7 (hard cap 7) for CREATE** and **2–4 (hard cap 4) for MUTATE**. These
caps OVERRIDE refine's 5–8: do NOT adopt 5–8 here, and do not read the
"defer to SKILL.md" line as licensing an 8th question.

---

## Contract summary

- **One question per turn.** Target the highest-priority ambiguity in the
  user's current input. Never batch.
- **Total budget**: 5–7 questions for CREATE (hard cap 7),
  2–4 for MUTATE (hard cap 4). Phase 2 + Phase 2.5 share the budget.
- **Never assume intent.** When ambiguous, ask. When silent, default and flag
  the defaulted field in the diff preview — never silently fabricate.
- **Immutable Objects**: commands, paths, URLs, version pins, and quoted
  strings from the user MUST be preserved verbatim through Phase 3.
- **Phase boundary**: stop at Phase 3 output. Do not implement, scaffold, or
  modify files during Phase 2.
- **Output shape**: the Phase 3 "Refined Prompt" MUST use the section headings
  fixed by craft-dashboard's `interview-hints.md` ("Output Shape") so the
  Phase 3 spec transform is deterministic.

## Token-budget safety

If the user signals "good enough" before all dimensions are clear, write the
draft anyway and flag low-confidence fields in Phase 3's diff preview. Never
silently fabricate values for missing spec fields.

## Abort signal

The user can leave the interview at any turn by typing a bare abort token —
one of:

```
cancel    abort    stop    exit    quit    quit-keep    중단    취소    그만
```

`quit-keep` is the only variant that preserves the working drafts; every
other token cleans them up.

On detection, the skill MUST:

1. Skip remaining inquiry, Phase 3, and all later phases.
2. Delete `<target>/.dashboard-priming.md` and
   `<target>/.dashboard-spec.draft.md` if they exist — unless the user
   typed `quit-keep`, in which case the drafts stay in place for a
   later re-entry.
3. Print a one-line confirmation: `interview cancelled — no files changed`
   (or `... — draft kept` if the user typed `quit-keep`).
4. Exit with status code 0. Do NOT continue with hand-off.

Headless mode never receives interactive input, so the abort signal does not
apply there.
