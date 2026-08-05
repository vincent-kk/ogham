# estimate — Error Handling

| Error                                                     | Action                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| No eligible run (refine not passed)                       | Display: "Phase 1 (refine) must pass first. Run /imbas:refine <source>."                                            |
| refined.md missing (legacy run)                           | Fall back to source.md with a report warning: "estimated from the unrefined source".                                |
| estimate already completed                                | Ask: "Re-estimate and overwrite?" — proceed only on confirmation (start_phase restarts the phase).                  |
| `estimator` agent fails / returns unparsable payload      | Display: "Estimator error — re-run /imbas:estimate. The run state stays in_progress."                               |
| mcp__plugin_imbas_tools__manifest_save schema rejection   | Repair the payload against references/output-schema.md and re-save; if unrepairable, report the Zod error and stop. |
| manifest_validate integrity errors                        | Fix (dedupe ids, drop unknown deps/track refs, reorder CI) and re-save; report what changed.                        |
| mcp__plugin_imbas_tools__run_transition precondition fail | Display: "Cannot transition: <error message from tool>."                                                            |
