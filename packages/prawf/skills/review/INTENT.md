# review — Multi-Agent Academic Peer Review

## Purpose

The main prawf skill. The chair (team lead) profiles and normalizes a paper, then
runs a native Claude Code team through the journal cycle: R1 soundness attack
(parallel) → R2 defense → R3 conditional re-review → adjudication. The verdict is a
pure function of unresolved soundness findings; significance is advisory.

## Structure

| Path                  | Role                                                       |
| --------------------- | ---------------------------------------------------------- |
| `SKILL.md`            | P0→R1→R2→R3→ADJ workflow entry (Tier-2a anti-yield)        |
| `orchestration.md`    | pipeline, state machine, dedup + verdict, contracts        |
| `field-profiles.md`   | profile schema, injection priority, universal fallback     |
| `templates.md`        | `review-report.md` / `qa-sheet.md` / `rebuttal.md` formats |
| `prompt-templates.md` | literal per-persona spawn prompts                          |
| `profiles/*.yaml`     | 4 built-in field profiles; personas at `../../agents/`     |

## Conventions

- The chair is the main session / team lead; personas are spawned as team workers.
- Findings cite `paper-normalized.md` coordinates (`§<section>¶<paragraph>` + line).
- Verdict counts UNRESOLVED soundness findings only; `impact` is advisory.
- Runtime output language follows `[filid:lang]`; ids/enums stay verbatim.

## Boundaries

### Always do

- Keep persona ids, deliverable filenames, and enums identical across `SKILL.md`,
  `orchestration.md`, `prompt-templates.md`, `templates.md`, and `../../agents/`.
- Inject a disabled axis's invariant question into the absorbing persona's R1 prompt.

### Ask first

- Changing the pipeline stage order or the verdict-derivation table.
- Adding a profile (also add `profiles/<name>.yaml` + a `field-profiles.md` entry).

### Never do

- Let the chair call external-search/measurement tools directly.
- Let `impact-assessor` raise the verdict above minor-revision.
- Let the strategist finalize `withdrawn` without the attacker's R3 confirmation.

## Dependencies

- Personas `../../agents/*.md`; profiles `./profiles/*.yaml`; native team tools (`TeamCreate`/`Task`).
