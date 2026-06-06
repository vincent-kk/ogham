# prawf

Multi-agent **academic peer review** for Claude Code. _Prawf_ is Welsh for
"test / proof".

Nine reviewer personas take a paper apart the way a journal committee would —
six soundness reviewers attack across distinct axes, an author's advocate
defends, and a handling editor adjudicates — and hand you back a defensible
verdict plus the questions you should expect at your defense. When the paper
holds up, it says so: **PASS (Accept)** is a real outcome, justified on evidence.

prawf is **pure markdown** — no MCP server, no hooks, no build step, zero runtime
dependencies. The evaluation is persona _reasoning_ run on Claude Code's native
team tools; external lookups (prior work, preregistration, plagiarism) are
delegated as a capability, never bound to a specific tool.

## Install

```bash
/plugin marketplace add vincent-kk/ogham
/plugin install prawf@ogham
```

## Skills

| Command                   | What it does                                                              |
| ------------------------- | ------------------------------------------------------------------------- |
| `/prawf:review`           | Full committee review of a paper → verdict + anticipated questions        |
| `/prawf:simulate-defense` | Rehearse your defense: the committee asks, you answer, you get coached    |
| `/prawf:rebuttal`         | Turn real reviewer comments into a rebuttal letter + revision checklist   |
| `/prawf:auto-fix`         | Apply the auto-fixable revisions from a review straight to the manuscript |

```bash
/prawf:review                      # auto-detect the field, run the full panel
/prawf:review --solo               # fast single-pass pre-check
/prawf:review --profile cs-ml      # force a field profile
/prawf:review --workdir ~/reviews  # pin the output root (or set PRAWF_WORKDIR)
/prawf:simulate-defense paper.pdf  # generate questions, then rehearse
/prawf:rebuttal paper.pdf reviews.txt
/prawf:auto-fix --dry-run          # preview the auto-fixable revisions, change nothing
```

## How it works

The chair profiles and normalizes the paper, then runs the journal cycle as a
native Claude Code team:

```
P0  Profile & normalize   detect field, load profile, build a shared coordinate system
R1  Attack (parallel)     six soundness reviewers + an advisory impact assessor
R2  Defense               the rebuttal-strategist answers every finding point-by-point
R3  Re-review (if needed)  the original reviewer accepts or rejects each defense
ADJ Adjudicate            dedup → verdict (Accept / Minor / Major / Reject)
```

**Soundness-only verdict.** The verdict is a pure function of _unresolved
soundness_ findings. Significance (novelty, impact) is scored separately and is
**advisory** — a low-impact paper is never rejected for being unexciting. A
defense only downgrades a finding when it is backed by a verifiable artifact
(an actual re-analysis, an external citation, or direct text), so the committee
cannot be talked out of a real flaw.

### The panel

| Line          | Personas                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Soundness (6) | argument-analyst, methodologist, statistical-auditor, causal-reviewer, bias-grader, integrity-auditor |
| Significance  | impact-assessor (advisory)                                                                            |
| Defense       | rebuttal-strategist                                                                                   |
| Mediation     | chair (and `adjudicator` for the `--solo` fast path)                                                  |

### Field profiles

A persona's identity is a field-agnostic _invariant question_; the field-specific
frameworks (EQUATOR, Bradford Hill, data-leakage checks, proof rigor, …) are
injected by a **field profile**. Four are built in — `empirical-science`, `cs-ml`,
`math-theory`, `humanities-qualitative` — and the chair auto-detects which to use
from the paper's content. Override with `--profile <name>`, or drop a custom
profile under `<workdir>/profiles/<name>.yaml` (workdir defaults to `.prawf/`). When
the field is unclear, prawf falls back to a universal menu rather than guess wrong.

## Outputs

`/prawf:review` writes `review-report.md` (the verdict, traceable to each finding)
and `qa-sheet.md` (the anticipated questions and, where one is clear, a solution)
under `<workdir>/review/<paper-slug>/`. The workdir defaults to `.prawf/`; pin it with
`--workdir <dir>` or `PRAWF_WORKDIR` to keep outputs in one place as your `pwd` changes.
All findings cite a coordinate in the chair's normalized snapshot of the paper.

## Documentation

- [CLAUDE.md](./CLAUDE.md) — working guide for contributors
- Korean: [README-ko_kr.md](./README-ko_kr.md)
