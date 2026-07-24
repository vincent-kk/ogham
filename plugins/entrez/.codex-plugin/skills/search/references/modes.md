# search — execution modes

`ExecutionMode` ∈ `interactive` (default) · `auto` (`--auto`).

|                      | `interactive` (default)                | `--auto` (pipeline)                            |
| -------------------- | -------------------------------------- | ---------------------------------------------- |
| QUERY_GEN checkpoint | present queries · USER_REFINE dialog   | auto-pass (unattended generation)              |
| recall gate          | show union · confirm before broadening | unattended convergence (loop until growth <5%) |
| RANK result          | discuss top-N · explain rationale      | auto-produce                                   |
| large jobs           | progress feedback + confirm            | unattended async + progress log                |
| termination          | return records · explain first         | write to file (+ `date_tag`) + SearchManifest  |

## --auto convergence

Loop `QUERY_GEN ↔ SEARCH` until one of: union growth <5%, cap exceeded, or
`operationBudget` / `recallIter ≤ 4` / `rateRetry ≤ 5` reached — no USER_REFINE
checkpoint. On guard breach finish in `FAILED` with the reason and partial
results (`partial: true`). Output goes to `output_path` with an optional date
tag (config `date_tag`).

**Unattended terminals**: in `--auto` there is no user to prompt, so any
condition the transition table routes to `BLOCKED_NEEDS_USER` (e.g. the same
query twice → 0 hits, oscillation) instead terminates as `FAILED` with the
reason and partial results. `BLOCKED_NEEDS_USER` is `interactive`-only.

## interactive quality loop

After `COMPLETE`, keep improving with the user via conversation: add query roles,
tighten/loosen date range, request abstracts/full text. Each refinement re-enters
the state machine; the `SearchManifest` records every pass for reproducibility.
