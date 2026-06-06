---
name: simulate-defense
user_invocable: true
description: "[prawf:simulate-defense] Rehearse a thesis/paper defense. The committee personas pose anticipated questions, the author (you) answers, and the rebuttal-strategist coaches each answer with tactics and evidence to cite. Reuses the prawf review personas. Triggers: 답변 시뮬레이션, 모의 심사, defense simulation, mock defense, Q&A 연습, 예상 질문 연습."
argument-hint: "[--batch] [--profile <name>] [<qa-sheet-or-paper-path>]"
version: "1.0.0"
complexity: medium
plugin: prawf
---

> **EXECUTION MODEL (Tier-2b, interactive escape hatch)**:
> Execute phases as a SINGLE CONTINUOUS OPERATION, except at explicitly
> marked `<!-- [INTERACTIVE] -->` points where the author's answers are
> required. After each non-interactive phase completes, IMMEDIATELY proceed
> to the next. NEVER yield the turn after a `Task` subagent returns or
> between non-interactive phases. Subagent question/coaching files are
> internal working data — do NOT dump them; present only the rehearsal.
> At `<!-- [INTERACTIVE] -->` markers, present the questions and yield the turn
> for the author's answers; once they arrive, resume the chain in your next
> response and run the remaining phases without further yields. With
> `--batch`, there is NO interactive point — generate model answers and run
> straight through (Tier-2a).

# simulate-defense — Defense Q&A Rehearsal

Rehearse the live defense. The committee asks the questions a real panel would
ask; you answer; the rebuttal-strategist (`../../agents/rebuttal-strategist.md`)
coaches each answer — what is strong, what is missing, which tactic
(revision / justification / clarification) fits, and what evidence to cite. This
is preparation, NOT a verdict — it never issues Accept/Reject.

> **References** (resolve via `${CLAUDE_PLUGIN_ROOT}/skills/review/<file>`, fallback `Glob`):
>
> - `../review/prompt-templates.md` — R1 anticipated-question and R2 defense prompts
> - `../review/orchestration.md` — question types (good/bad/cringy), defense tactics
> - `../../agents/<persona-id>.md` — the reviewer personas and the strategist

## When to Use

- Preparing for a thesis defense, conference Q&A, or committee meeting.
- Pressure-testing answers to the hardest anticipated questions before the real event.
- Turning a prior `/prawf:review` `qa-sheet.md` into an interactive rehearsal.

## Core Workflow

### Phase 0 — Resolve questions (direct + optional spawn)

1. If a `qa-sheet.md` from a prior `/prawf:review` is supplied or found, load its
   anticipated questions directly — no spawning needed.
2. Otherwise, take the paper, run P0-lite (detect profile, normalize to
   `paper-normalized.md`), and spawn a LIGHT panel of soundness reviewers as
   standalone `Task`s (no team is needed for question generation) in question-only
   mode (each emits its `anticipated_question` set per
   `../review/prompt-templates.md` §1, without full findings). Then spawn
   `rebuttal-strategist` to refine and classify each question as
   `good | bad | cringy`.

**→ Immediately proceed to Phase 1.**

### Phase 1 — Present the panel (direct)

Group the questions by axis and order them hardest-first. Show each with its
`question_type`. Keep it a question set — do NOT answer them yourself.

**→ Immediately proceed to Phase 2.**

### Phase 2 — Author answers <!-- [INTERACTIVE] -->

Present the questions and ask the author to answer them (one axis at a time is
fine). **Wait for the author's answers** (yield the turn), then resume in your
next response.

> With `--batch`: skip the wait. Generate plausible model answers (clearly
> labelled as simulated) and proceed — the whole skill then runs Tier-2a with no
> yield.

**→ Once answers are in hand, immediately proceed to Phase 3.**

### Phase 3 — Coach (strategist)

Spawn `rebuttal-strategist` as the coach. For each answer it returns: a strength
read, the gaps a real panel would exploit, the fitting tactic
(`revision | justification | clarification | sidestep | deferral`), the evidence
to cite (`paper-normalized.md` coordinate where possible), and a tighter
re-phrasing. Honest "unresolved — needs more data" coaching is allowed; never
manufacture a defense for a fatal flaw.

**→ Immediately proceed to Phase 4.**

### Phase 4 — Output (direct)

Write `defense-session.md`: the mock Q&A transcript (question, author answer,
coaching) plus a short readiness summary (which axes are solid, which need work).
This is advisory rehearsal output — it carries no verdict.

**After `defense-session.md` is written, execution is COMPLETE.**

## Options

| Option             | Default | Description                                                        |
| ------------------ | ------- | ------------------------------------------------------------------ |
| `--batch`          | off     | Non-interactive: generate model answers, run Tier-2a               |
| `--profile <name>` | auto    | Field profile for question generation (when starting from a paper) |

## Quick Reference

```
/prawf:simulate-defense qa-sheet.md        # rehearse from a prior review's questions
/prawf:simulate-defense paper.pdf          # generate questions, then rehearse
/prawf:simulate-defense --batch paper.pdf  # full simulated Q&A + coaching, no prompts

Flow:    resolve questions → present panel → [author answers] → coach → defense-session.md
Reuses:  the soundness reviewers (questions) + rebuttal-strategist (coaching)
Output:  defense-session.md (mock Q&A + coaching + readiness summary). No verdict.
```
