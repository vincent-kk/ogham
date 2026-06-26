# search — state machine (Dispatcher)

States: `INTAKE · CLASSIFY · QUERY_GEN · SEARCH · RANK · COMPLETE` + terminals
`FAILED · BLOCKED_NEEDS_USER`. `USER_REFINE` is not a state — it is the
`interactive` checkpoint between `QUERY_GEN` and `SEARCH`.

## SEARCH internal stages (code, not states)

`paper-search` runs these deterministically; they never appear in the transition
table, only consume `operationBudget`:
`query_lint → count_probe → date_segment → fetch_ids → fetch_records(POST·batch) → union·dedup → partial_recovery`.

## Transition table

| From      | Event / Guard                                    | To                          | Action                                                       |
| --------- | ------------------------------------------------ | --------------------------- | ------------------------------------------------------------ |
| INTAKE    | request                                          | CLASSIFY                    | normalize `{topic, db, dateRange, mode}`                     |
| CLASSIFY  | FULL_SEARCH                                      | QUERY_GEN                   | —                                                            |
| CLASSIFY  | QUERY_ONLY                                       | (query skill) → COMPLETE    | queries only, no search                                      |
| CLASSIFY  | DOWNLOAD                                         | (download skill) → COMPLETE | fetch-fulltext                                               |
| CLASSIFY  | NEEDS_CLARIFICATION                              | BLOCKED_NEEDS_USER          | ask topic/scope/db                                           |
| QUERY_GEN | query set emitted                                | SEARCH                      | agent generation mode _(interactive: present + USER_REFINE)_ |
| QUERY_GEN | user edits (interactive)                         | QUERY_GEN                   | regenerate                                                   |
| SEARCH    | union sufficient (growth <5%)                    | RANK                        | dedup union complete                                         |
| SEARCH    | union weak                                       | QUERY_GEN                   | `recallIter++` → broaden (recall gate)                       |
| SEARCH    | large (thousands)                                | SEARCH                      | async job + progress                                         |
| SEARCH    | 429 / partial failure                            | SEARCH                      | `rateRetry++` backoff · partial_recovery                     |
| RANK      | rerank done                                      | COMPLETE                    | top-N ordered _(interactive: discuss)_                       |
| RANK      | pre-score candidates 0                           | QUERY_GEN                   | `recallIter++`                                               |
| (any)     | `recallIter>4` · budget exceeded · `rateRetry>5` | FAILED                      | reason + manifest                                            |
| (any)     | same query twice → 0 hits                        | BLOCKED_NEEDS_USER          | ask to redefine                                              |
| (any)     | MCP `NOT_CONFIGURED` (no tool/email)             | (setup skill) → resume      | route to `setup` pre-flight + wizard, then re-enter prior state (never bare FAILED) |

## Recall gate (the point of the whole flow)

Before leaving `SEARCH`/`RANK`, check union sufficiency:

"Weak" is a **qualitative** judgment, not a fixed number — a sufficient yield is
topic-dependent, so no absolute threshold is hardcoded. The deterministic
terminator is the convergence criterion (union growth <5%); weakness only
decides whether to _enter_ the broadening loop.

| Signal                                                    | Action                                                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `total_unique` weak (qualitative — too few for the topic) | re-enter QUERY_GEN → broaden (weight `ATM_BROAD`·`MESH_EXPLODED`·`ALL_FIELDS`; relax `[mh:noexp]`/over-narrow `[tiab]`) |
| ESpell OOV / spelling-warning / union 0                   | apply ESpell correction → retry QUERY_GEN                                                                               |
| union growth ≥5%                                          | keep looping (within guards)                                                                                            |
| union growth <5% OR cap exceeded OR user stop             | converged → RANK                                                                                                        |
| `Count > 10000`                                           | NOT a gate — SEARCH date-segments internally for full coverage                                                          |

Terminate recall = `recallIter ≤ 4` AND (growth <5% OR cap OR user stop) AND
budget remaining.

## Divergence handling

- Same query twice → 0 hits: `BLOCKED_NEEDS_USER` (redefine topic).
- `recallIter` spent + no growth: RANK what exists, or `FAILED` (state weakness).
- Agent repeats the same broad query: force a different `QueryRole`.
- 429 streak past `rateRetry`: `FAILED` (suggest off-peak: US Eastern 21:00–05:00 / weekends).

Methodology SSoT: `../../_shared/query-strategy.md` (generation) and
`../../_shared/rerank.md` (rerank). Tool contracts: `../../_shared/mcp-tools.md`.
