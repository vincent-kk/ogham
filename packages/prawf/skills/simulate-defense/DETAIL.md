# simulate-defense — Public Contract Specification

A rehearsal orchestration over the prawf review personas. No verdict, no findings
state machine — questions, answers, and coaching only.

## Requirements

- The skill MUST reuse the existing personas (`../../agents/`); it MUST NOT define
  new reviewers or duplicate their logic.
- It MUST NOT emit a verdict (`accept`/`minor-revision`/`major-revision`/`reject`)
  or a pass/fail outcome — it is preparation, not judgment.
- Interactive mode MUST yield only at the author-answer step (`<!-- [INTERACTIVE] -->`);
  `--batch` MUST run with no interactive yield.
- Coaching MUST stay honest: a fatal flaw is coached as `unresolved`, never given a
  fabricated defense.

## API Contracts

### Inputs

- A `qa-sheet.md` from a prior `/prawf:review` (preferred), or a paper path. With a
  paper, P0-lite + a LIGHT reviewer panel generate the questions.
- `--batch` (model answers, Tier-2a); `--profile <name>` (question generation profile).

### Flow

`resolve questions → present panel → [author answers] → coach (rebuttal-strategist)
→ defense-session.md`.

### Reused enums

`question_type` (`good | bad | cringy`) and `tactic`
(`revision | justification | clarification | sidestep | deferral`) are reused
verbatim from `../review/orchestration.md`.

### Output

`defense-session.md` — mock Q&A transcript (question, answer, coaching) plus a
readiness summary per axis. Advisory only.
