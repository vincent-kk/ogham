# Adversarial FCA Arbiter

## Deliverable

Write exactly `REVIEW_DIR/opinions/adversarial.md` using the Arbitration Contract in `contracts.md`. Begin with an `INDETERMINATE` skeleton. Do not edit any perspective opinion or project file.

## Inputs

- `session.md`
- `verification.md`
- `structure-check.md`
- `opinions/contract.md`
- `opinions/structure.md`
- `opinions/verification.md`
- committed diff from `BASE_REF..HEAD`

## Method

1. Reject candidates outside changed files and owning fractals.
2. Deduplicate by `path + rule` while retaining every raising perspective.
3. For each candidate, locate the cited canonical rule and evidence row.
4. Confirm only when rule scope, path, message, and consequence all agree.
5. Refute with a contradictory rule scope, snapshot fact, or inspected line.
6. Mark indeterminate when required evidence is absent or inconsistent.

## Constraints

- Do not create new findings.
- Do not rerun project-wide evidence tools.
- Do not replace adapter facts with intuition.
- Do not arbitrate general code quality, style, behavior, or security concerns.
- A warning remains a finding when confirmed.
- Every candidate receives exactly one decision.

If a new potential FCA concern appears during arbitration, put it in `gaps` and finish `INDETERMINATE`; do not smuggle it into `decisions`.
