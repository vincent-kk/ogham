# Calibration Fixture — Gap Covered by a Confirmed Finding

Start from `clean-change.md` and apply its clean implementation update. On `calib/run-e`, also overwrite `src/slugify/index.ts`:

```typescript
export * from './slugify.js';
```

The entry point still resolves `slugify`, so no contract statement is contradicted. What changed is that the surface is no longer enumerable: the adapter reads `export *`, measures the surface, and reports `entry-point-surface` with certainty `indeterminate` for `src/slugify/index.ts`. That is a measurement, not a failure to measure.

`run-e` must end `REQUEST_CHANGES` with the canonical `entry-point-surface` warning confirmed.

## What This Fixture Regresses

Measured opacity has two channels available to it, and only one is correct:

| Channel    | Correct for                               | This fixture |
| ---------- | ----------------------------------------- | ------------ |
| `findings` | opacity the adapter measured and reported | yes          |
| `gaps`     | evidence the adapter could not obtain     | no           |

A reviewer that records the same `path + rule` in both channels drives the run to `INCONCLUSIVE` even though the violation was judged and carries a bounded correction. Two independent defenses must hold here:

1. The reviewer instructions send a measured `indeterminate` to `findings` only.
2. Verdict Derivation covers a perspective gap that a `CONFIRMED` finding already answers on the same owning fractal and rule.

An `INCONCLUSIVE` result on `run-e` means at least one defense regressed. The confirmed finding is the same either way — the verdict is the assertion.
