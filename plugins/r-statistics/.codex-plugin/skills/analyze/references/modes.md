# analyze — Execution Modes

The dispatcher runs in one of two modes. `interactive` is the default;
`--auto` switches to the unattended pipeline.

|                                     | `interactive` (default)                    | `--auto` (pipeline)                            |
| ----------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| Hard gate (`assert` `hard_block`)   | block → re-select                          | block → re-select                              |
| Soft warning (`assert` / validator) | **discuss with the user**, proceed allowed | **strict re-select**, unattended               |
| Checkpoints (SAP, results)          | present, then discuss                      | auto-pass, no pause                            |
| Termination                         | return results + explanation first         | converge the quality loop, then emit artifacts |

## interactive

Optimize for understanding. Block only on hard-gate violations. Present the SAP
before executing and the results after, and improve quality through
conversation. Soft warnings are surfaced as discussion points, not auto-blocks.
Reporting (Quarto export) happens on request.

## --auto

Optimize for an unattended, high-quality result. Apply hard and soft criteria
strictly and automatically: soft warnings force re-selection, checkpoints pass
without waiting, and the loop iterates (within the guards) until it converges.
On guard exhaustion, terminate as `FAILED` with the reason and partial
artifacts — never silently downgrade the analysis.

Both modes share the same state machine, iteration guards, and the deterministic
`assert` hard gate; only the soft-warning handling, checkpoint behavior, and
termination differ.
