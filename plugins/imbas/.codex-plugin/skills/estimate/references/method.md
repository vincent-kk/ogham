# estimate — Method

The estimation method is deterministic by construction: the same refined.md and the same coefficients must yield the same WBS structure. All rules below are executed by the `estimator` agent.

## 1. Three-View Decomposition

Decompose the refined document three times, independently — a unit of work missed by one view is caught by another:

| View    | Unit                       | Extract                                                                                    |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| Page    | Screen                     | Screen list, per-screen states (empty/loading/error/success), responsive/platform variants |
| Feature | User-facing capability     | CRUD flows, search/filter, permission branches, external integrations, notifications       |
| Module  | Domain/cross-cutting block | Auth, payments, file handling, admin, policy engines — foundations no screen shows         |

## 2. Reconciliation → Single WBS

- **Merge duplicates**: units producing the same deliverable collapse into one; `view_refs` records every originating view entry (e.g., "로그인 화면" from Page + "이메일 로그인" from Feature → one unit).
- **Keep single-view finds**: a unit only one view surfaced is kept and flagged `single_view: true` — these appear in the report's confirmation list for the user.
- **Depth rule**: a unit graded beyond XL is decomposed one level further until every unit fits the S–XL scale.

## 3. Complexity Grading + PERT

- Grade each unit `S | M | L | XL`. `config.estimation.complexity_baseline` anchors the most-likely value **m**.
- Three-point estimate per unit: optimistic **o**, most-likely **m**, pessimistic **p** — each with a one-sentence rationale (e.g., "external API contract unconfirmed → p weighted").
- PERT: `expected = (o + 4m + p) / 6`, `sigma = (p − o) / 6`.
- Rollup: `sum_expected = Σ expected` → add overhead (`overhead_ratio`: integration, test, pm — each a ratio of sum_expected) → apply `buffer_ratio` → `buffered_total`.
- Confidence interval: `[buffered_total − 2σ_total, buffered_total + 2σ_total]` where `σ_total = √(Σ sigma²)`.

## 4. Schedule Layout

1. Extract unit dependencies (`deps`) from the document's own ordering constraints (an API before its UI, auth before anything gated by it). Never invent dependencies.
2. Topologically order units; assign to `config.estimation.team_size` parallel tracks — dependency-free units run concurrently, each track's load balanced by expected man-days.
3. Convert to weeks with `available_manday_per_week` per track member; `total_weeks = ceil(longest track / available_manday_per_week)`.
4. Milestones at module boundaries, external-integration completions, and overall completion.

## 5. Principles

1. **No codebase access** — the estimate is a planning-side judgment; "the existing code makes this cheap" is a developer-side correction that does not belong here.
2. **Every assumption explicit** — anything the document does not answer but the estimate needs is written into `assumptions`; a changed assumption invalidates the estimate.
3. **Uncertainty is part of the answer** — report intervals, not single numbers; units with large sigma are auto-promoted into `risks`.
4. **Reproducible** — decomposition follows the rules above mechanically; rationale sentences justify numbers, not structure.
