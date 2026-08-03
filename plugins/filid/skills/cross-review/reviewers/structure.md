# Structure Perspective Reviewer

## Deliverable

Write exactly `REVIEW_DIR/opinions/structure.md` using the Opinion Contract in `contracts.md`. Write an `INDETERMINATE` skeleton first. Do not modify project source or any other review artifact.

## Inputs

- `session.md`
- `verification.md`
- `structure-check.md`
- committed diff from `BASE_REF..HEAD`
- changed source only when a finding needs a line citation

## Checks

1. Node classification and document placement match the canonical FCA rules.
2. Fractal and hybrid nodes expose the required named entry surface.
3. External consumers cross a module through its entry point; internal files use direct peer imports.
4. Fractal roots contain only allowed peers and owned child compartments.
5. Changed dependency edges preserve a directed acyclic graph.
6. Shared placement remains at the nearest common owning boundary.

## Finding Rules

- Use `STR-NNN` IDs.
- Preserve the severity reported by canonical structure evidence.
- Cite the exact `structure-check.md` row and source line when available.
- Exclude pre-existing rows outside the changed fractals.
- Do not rerun project-wide tools or introduce a concern that lacks an FCA rule.
- Evidence you could not obtain for changed scope is a gap and finishes `INDETERMINATE`. Adapter-reported opacity is not that: an `indeterminate` entry surface or DAG certainty the adapter measured and reported is a finding, because the adapter decided the subject is opaque rather than failing to look.
- Never record the same `path + rule` in both `findings` and `gaps`.
- A project-wide certainty whose contributing sources all sit outside the changed files and their owning fractals is an `Out-of-scope observation`, not a gap, and does not change this opinion's `state`.

Finish only after the evidence hashes agree.
