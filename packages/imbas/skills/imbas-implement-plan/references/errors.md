# Errors

| Code | Condition | Recovery |
|---|---|---|
| `E-IP-1` | Cycle resolution failed (cycle detected but no edge removable) | Manual edit of stories-manifest `links` or devplan `tasks[].blocks` to break cycle; re-run |
| `E-IP-2` | unresolved.length > 0 after all cycle breaking | Review `unresolved` list; check DAG for disconnected/invalid nodes |
| `E-IP-3` | Source manifest missing or phase state mismatch | Complete the required phase (split or devplan) first, or switch `--source` |
| `E-IP-4` | Schema validation failed on save | Check types/manifest.ts schema; do not edit generated manifests manually |
| `E-IP-5` | `--max-parallel` value ≤ 0 | Provide a positive integer or omit for no cap |

## Non-blocking notices

- `cycles_broken.length > 0` is a notice, not an error. The plan is still valid;
  the resolution log indicates which edge was removed deterministically.
- `degraded: true` (stories-only mode) is a precision warning, not an error.
