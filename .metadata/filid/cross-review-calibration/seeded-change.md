# Calibration Fixture — Seeded FCA Violations

Start from `clean-change.md` and apply its clean implementation and verification update. On `calib/run-c`, make these two additional changes.

Overwrite `src/index.ts`:

```typescript
export { slugify } from './slugify/slugify.js';
```

This bypasses the child fractal entry point.

Add `src/slugify/tests/INTENT.md`:

```markdown
# tests

Independent documentation inside a test organ.
```

The new document violates the organ document boundary.

These two edits seed exactly two rule violations. The remaining four expected candidates derive from the `INTENT.md` seed: `.claude/rules/filid_fractal-boundaries.md` §1 classifies a directory with `INTENT.md` as a fractal at step (1), before the known-organ-name check at step (4). That promotion makes `tests/` subject to the fractal document, entry-point, and peer-file rules.

| Origin | Category | Severity | Path | Rule |
| --- | --- | --- | --- | --- |
| seeded | structure | error | `src/index.ts` | `external-import-boundary` |
| seeded | structure | warning | `src/slugify/tests/INTENT.md` | `organ-no-intentmd` |
| derived from the `INTENT.md` seed | contract | error | `src/slugify/tests` | `detail-document-contract` |
| derived from the `INTENT.md` seed | contract | warning | `src/slugify/tests` | `module-entry-point` |
| derived from the `INTENT.md` seed | structure | warning | `src/slugify/tests` | `zero-peer-file` |
| derived from the `INTENT.md` seed | contract | warning | `src/slugify/tests/INTENT.md` | `intent-document-contract` |

`run-c` passes calibration only when its candidate set is exactly these six rows, the two seeded rows are confirmed by independent verification, and each derived row is either confirmed or explicitly tied to the same `INTENT.md` seed. It must end `REQUEST_CHANGES`; any candidate outside these six fails the fixture.
