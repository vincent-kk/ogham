# Preconditions

## Required run state

- `stories-manifest.json` MUST exist in the run directory.
- For `--source devplan` (default): `devplan-manifest.json` MUST also exist and
  `state.phases.devplan.status === 'completed'` with `pending_review === false`.
- For `--source stories`: `state.phases.split.status === 'completed'` is sufficient,
  but the output is marked `degraded: true`.

## Resolution rules

- If `--run` is omitted: pick the most recent run that satisfies the source's
  requirement (devplan for default, split for stories-only).
- If `--run` is provided but does not satisfy the requirement: STOP with
  error code `E-IP-3` (see errors.md).

## State transitions

This skill does NOT modify `state.json` phase fields. It only writes
`implement-plan.json` and `implement-plan-report.md` inside the run directory.
