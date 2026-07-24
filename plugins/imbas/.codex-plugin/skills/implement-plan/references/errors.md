# Errors

| Code     | Condition                                                                                                    | Recovery                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `E-IP-2` | Manifest `unresolved[]` non-empty after cycle breaking                                                       | Review `unresolved` list; check DAG for disconnected/invalid nodes         |
| `E-IP-3` | Source manifest missing or phase state mismatch                                                              | Complete the required phase (split or devplan) first, or switch `--source` |
| `E-IP-4` | Internal: generated manifest failed schema validation (should not occur — indicates an implementPlanner bug) | Report the error; do not edit generated manifests manually                 |
| `E-IP-5` | `--max-parallel` value ≤ 0 (rejected by tool input schema)                                                   | Provide a positive integer or omit for no cap                              |

Unbreakable cycles do not have a dedicated error code: the tool resolves every
detected cycle deterministically (lowest-weight edge removal) and reports the
removals in `cycles_broken[]`; anything it cannot place lands in `unresolved[]`
(`E-IP-2`).

## Non-blocking notices

- `cycles_broken.length > 0` is a notice, not an error. The plan is still valid;
  the resolution log indicates which edge was removed deterministically.
- `degraded: true` (stories-only mode) is a precision warning, not an error.
