# analyze — State Machine

The dispatcher's deterministic core. States, transitions, iteration guards, and
divergence handling. Only the dispatcher transitions; agents recommend only.

## States

`INTAKE · CLASSIFY · STATISTICIAN_PLAN · ASSERT_PLAN · R_EXECUTION · VALIDATION ·
REPORTING · COMPLETE` plus terminals `FAILED` and `BLOCKED_NEEDS_USER`.

`methodology-query`, `troubleshoot`, and `partial-step` are terminating branches
of `CLASSIFY`. Human confirmation is not a separate state — it is `interactive`
mode's checkpoint behavior.

## Transition table

| From              | Event / Guard                    | To                        | Action                                         |
| ----------------- | -------------------------------- | ------------------------- | ---------------------------------------------- |
| INTAKE            | request                          | CLASSIFY                  | normalize, bind workspaceId                    |
| CLASSIFY          | full-analysis                    | STATISTICIAN_PLAN         | —                                              |
| CLASSIFY          | partial-step                     | (sub-skill) → COMPLETE    | minimal path                                   |
| CLASSIFY          | troubleshoot                     | (r-expert) → COMPLETE     | —                                              |
| CLASSIFY          | methodology-query                | (statistician) → COMPLETE | —                                              |
| CLASSIFY          | needs-clarification              | BLOCKED_NEEDS_USER        | ask the user                                   |
| STATISTICIAN_PLAN | SAP produced                     | ASSERT_PLAN               | statistician call _(interactive: present SAP)_ |
| ASSERT_PLAN       | ok                               | R_EXECUTION               | —                                              |
| ASSERT_PLAN       | hard_block · (auto) soft_warning | STATISTICIAN_PLAN         | methodologyIter++                              |
| ASSERT_PLAN       | (interactive) soft_warning       | R_EXECUTION               | proceed + warn (discuss)                       |
| R_EXECUTION       | success                          | VALIDATION                | collect artifacts                              |
| R_EXECUTION       | recoverable error                | R_EXECUTION               | rRepairIter++ (r-expert retry)                 |
| R_EXECUTION       | unrecoverable                    | FAILED                    | —                                              |
| VALIDATION        | ok / soft_warning                | REPORTING (or return)     | _(interactive: discuss → improve)_             |
| VALIDATION        | block                            | STATISTICIAN_PLAN         | validatorIter++                                |
| REPORTING         | done                             | COMPLETE                  | Quarto output (on request)                     |
| (any)             | guard exceeded                   | FAILED                    | report reason                                  |
| (any)             | oscillation / deadlock           | BLOCKED_NEEDS_USER        | request user decision                          |

## Iteration guards (multi-layer)

`methodologyIter ≤ 3` · `rRepairIter ≤ 3` · `validatorIter ≤ 2` ·
`totalTransitions ≤ 25`. Exceeding any → `FAILED` with the reason and the
partial artifacts collected so far.

## Divergence handling

| Signal                                               | Action                                     |
| ---------------------------------------------------- | ------------------------------------------ |
| Same `assert` failure twice                          | stop → BLOCKED_NEEDS_USER                  |
| Validator blocks on the same issue repeatedly        | FAILED                                     |
| Statistician oscillates between incompatible methods | BLOCKED_NEEDS_USER                         |
| r-expert tries to change the SAP method              | block (technique = statistician only)      |
| New hypothesis contradicts the current SAP           | invalidate SAP → restart STATISTICIAN_PLAN |

## Hand-off (immutable · auditable)

The dispatcher passes the SAP, artifact references, and `priorDecisions`
(an append-only `DecisionRecord[]`) to each agent; agents return a structured
delta. Every transition and decision is recorded for reproducibility.
