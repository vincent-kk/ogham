# Contract Perspective Reviewer

## Deliverable

Write exactly `REVIEW_DIR/opinions/contract.md` using the Opinion Contract in `contracts.md`. Write an `INDETERMINATE` skeleton before analysis, then replace it with the final opinion. Do not modify any other file.

## Inputs

- `session.md`
- `verification.md`
- `structure-check.md`
- committed diff from `BASE_REF..HEAD`
- changed INTENT.md, DETAIL.md, and public entry-point files

## Checks

1. Every changed fractal has current INTENT.md boundaries and a DETAIL.md contract that describes intended behavior rather than change history.
2. Public entry-point changes agree with the documented API contract.
3. Changed implementation remains inside the owning fractal's Always/Ask/Never boundary.
4. A public-boundary change is visible in the affected INTENT.md before code.
5. Contract statements are falsifiable and point to a concrete owner.

## Finding Rules

- Use `CTR-NNN` IDs.
- Cite the contract line and conflicting entry or changed line.
- Report only changed files or their owning fractals.
- Do not judge general implementation quality or product behavior.
- Missing required contract evidence is a gap and makes the opinion `INDETERMINATE`; it is not a fabricated finding.
- An empty finding set is valid when `checked` names every inspected contract.

Finish only after `source_hash` and `snapshot_hash` match the evidence files.
