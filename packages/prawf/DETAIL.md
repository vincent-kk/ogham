# prawf — Public Contract Specification

The package surface is three skills backed by ten persona agents. There is no
code API: every contract below is a markdown/orchestration agreement consumed by
Claude Code at runtime.

## Requirements

- The plugin MUST load with `skills` only — no `mcpServers`, no `hooks`, no build
  artifacts. `validate-plugin` MUST pass against `.claude-plugin/plugin.json`.
- Persona ids, deliverable filenames, axis ids, and verdict/status enums MUST be
  identical across `agents/*.md`, `skills/review/orchestration.md`,
  `skills/review/prompt-templates.md`, `skills/review/templates.md`, and each
  `SKILL.md`.
- The verdict MUST be a pure function of unresolved **soundness** findings.
  Significance (`impact-assessor`) is advisory and MUST NOT raise a verdict above
  Minor Revision.

## API Contracts

### Skills

| Command                     | Purpose                                          | Primary output                          |
| --------------------------- | ------------------------------------------------ | --------------------------------------- |
| `/prawf:review`             | 9-persona team evaluation (P0 → R1 → R2 → R3 → ADJ) | `review-report.md` + `qa-sheet.md`      |
| `/prawf:simulate-defense`   | committee questions → author answers → coaching  | mock Q&A session + coaching notes       |
| `/prawf:rebuttal`           | external review comments → point-by-point reply  | `rebuttal-letter.md` + `revision-checklist.md` |

`/prawf:review` options: `--solo` (single-pass `adjudicator`), `--profile <name>`
(field-profile override), `--scope <abstract|full>`.

### Persona roster (10)

- Soundness attack (verdict-eligible): `argument-analyst`, `methodologist`,
  `statistical-auditor`, `causal-reviewer`, `bias-grader`, `integrity-auditor`.
- Significance (advisory): `impact-assessor`.
- Defense: `rebuttal-strategist`. Mediation: `chair`. Solo fast-path: `adjudicator`.

### Enums

- `verdict`: `accept | minor-revision | major-revision | reject`.
- finding `severity`: `critical | major | minor` (rubric: critical = unrecoverable
  without new data; major = recoverable within existing data; minor = conclusion
  unchanged).
- finding `status`: `raised → contested → defended | mitigated | unresolved | withdrawn`.
- `impact`: `high | moderate | low | niche` (advisory).
- `external_verification`: `complete | partial | unavailable`.

### Deliverable filenames

`paper-profile.md`, `paper-normalized.md`, `findings/round-1-<axis>.md`,
`rebuttal.md`, `findings/round-3-<axis>.md`, `review-report.md`, `qa-sheet.md`.
All locations cite `paper-normalized.md` coordinates (`§<section>¶<paragraph>` + line).

### Versioning

`version:sync` mirrors `package.json` version into `plugin.json` only (there is no
`src/version.ts`). The root `scripts/inject-version.mjs` skips version-file
generation when `src/` is absent. After a Changesets bump, run
`yarn prawf version:sync` to refresh `plugin.json`.
