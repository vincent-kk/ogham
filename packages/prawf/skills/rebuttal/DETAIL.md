# rebuttal — Public Contract Specification

A defense-only orchestration: it reuses the prawf review defense round over
externally-supplied reviewer comments and assembles the author response.

## Requirements

- The skill MUST skip R1 (the attack round) — external reviewers already attacked.
- It MUST reuse `rebuttal-strategist` for the defense and `chair` for assembly; it
  MUST NOT redefine those personas.
- A downgrade claim MUST be backed by a verifiable artifact, and fatal flaws MUST be
  conceded honestly (per `../review/orchestration.md` §4.3).
- Every reviewer comment MUST appear in `revision-checklist.md` with an explicit
  status; a declined comment MUST carry a justification.

## API Contracts

### Inputs

- A paper path and the external review comments (file or pasted text). Missing
  either is the one valid yield point.
- `--profile <name>` for framework-aware defense framing.

### Flow

`parse comments → external-findings.md → R2 defense (rebuttal.md) →
rebuttal-letter.md + revision-checklist.md`. Terminal marker:
`prawf rebuttal: complete`.

### Intermediate

`external-findings.md` — each reviewer point as a structured finding (axis,
severity, `location`, claim, reviewer-of-origin), standing in for
`findings/round-1-<axis>.md`.

### Outputs

- `rebuttal-letter.md` — point-by-point response, each item tagged **Revision** /
  **Justification** / **Clarification**, citing `paper-normalized.md` coordinates.
- `revision-checklist.md` — one row per comment: planned change, location, status
  (`done | planned | declined`), and a justification for declines.
