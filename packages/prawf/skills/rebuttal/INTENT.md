# rebuttal — Response to External Reviewers

## Purpose

Turns real external reviewer comments into a point-by-point rebuttal letter and a
revision checklist. The attack round is skipped — the external reviewers already
filed the findings — so the skill runs the prawf defense round (R2) directly, then
the chair assembles the letter. Tier-2a: no yield except for missing inputs.

## Structure

| Path       | Role                                                          |
| ---------- | ------------------------------------------------------------ |
| `SKILL.md` | inputs → external-findings → R2 defense → letter + checklist  |

## Conventions

- Reuses `../../agents/chair.md` (assemble) and `rebuttal-strategist.md` (defend).
- External comments are taken as given; the skill does NOT re-derive findings.
- Letter items are tagged Revision / Justification / Clarification; locations cite
  `paper-normalized.md` coordinates.
- Downgrade claims still require a verifiable artifact (review §4.3 discipline).

## Boundaries

### Always do

- Map every reviewer comment to a checklist row with an explicit status.
- Keep an acceptive, calm tone in the letter (no defensiveness).

### Ask first

- Declining a reviewer comment outright (record a justification in the checklist).

### Never do

- Run the R1 attack round (external reviewers already attacked).
- Manufacture a defense for a fatal flaw instead of conceding it honestly.

## Dependencies

- Personas: `../../agents/{chair,rebuttal-strategist}.md`. Formats: `../review/templates.md`.
