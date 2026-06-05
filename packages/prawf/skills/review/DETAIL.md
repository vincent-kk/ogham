# review — Public Contract Specification

The review skill is an orchestration contract: the chair (main session) drives a
five-stage pipeline and spawns persona agents as team workers. All schemas below are
markdown/frontmatter agreements, not a code API. `orchestration.md` is authoritative
for the full state machine and frontmatter contracts; this file is the summary.

## Requirements

- The pipeline MUST run as a single continuous operation (Tier-2a anti-yield): no
  yield between rounds, after worker returns, or after `TeamDelete`.
- The chair MUST NOT call external-search or measurement tools directly; it
  synthesizes the attack/defense deliverables only.
- The verdict MUST be derived from UNRESOLVED soundness findings only. `impact` is
  advisory and MUST NOT raise the verdict above `minor-revision`.
- Every finding MUST cite a `paper-normalized.md` coordinate; the chair MUST reject a
  profile that disables `argument`, `methodology`, or `integrity`.
- Persona ids, deliverable filenames, and enums MUST match `../../agents/*.md`,
  `orchestration.md`, `prompt-templates.md`, and `templates.md`.

## API Contracts

### Pipeline stages

| Stage | Actor                          | Output                                  |
| ----- | ------------------------------ | --------------------------------------- |
| P0    | chair (direct)                 | `paper-profile.md`, `paper-normalized.md` |
| R1    | convened reviewers + impact    | `findings/round-1-<axis>.md`            |
| R2    | rebuttal-strategist            | `rebuttal.md`                           |
| R3    | original reviewers (conditional) | `findings/round-3-<axis>.md`          |
| ADJ   | chair (direct)                 | `review-report.md`, `qa-sheet.md`       |

`--solo` replaces R1-ADJ with a single standalone `adjudicator` Task writing
`review-report.md`.

### Panel sizes

- `LIGHT` — `argument` + one core axis + impact (abstract / single issue).
- `STANDARD` — 3-4 axes + impact (typical paper).
- `FULL` — all six soundness axes + impact (nine personas).
- `argument-analyst`, `chair`, `rebuttal-strategist` are always convened.

### Verdict derivation (UNRESOLVED soundness only)

`critical ≥ 1` → `reject`; `major ≥ 1` → `major-revision`; all majors MITIGATED and
none critical/major UNRESOLVED → `minor-revision`; only minor UNRESOLVED →
`minor-revision`; none UNRESOLVED → `accept`. Fatal-flaw override keeps Temporality,
p-hacking + preregistration mismatch, data leakage, and data manipulation `critical`
unless verifiably defended. When `external_verification: unavailable`, an Accept is
labelled `provisional-accept`.

### Frontmatter contracts

The finding (R1), impact (R1), rebuttal (R2), re-review (R3), and chair verdict
(review-report) frontmatter schemas are defined in `orchestration.md` §5.1-5.5 and
MUST be kept in sync with it.

### Options

`--solo` (adjudicator single-pass), `--profile <name>` (override; built-ins
`natural-science`, `cs-ml`, `math-theory`, `humanities-qualitative`), `--scope`
(`abstract` → LIGHT, `full` → STANDARD/FULL).
