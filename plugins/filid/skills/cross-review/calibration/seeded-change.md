# Calibration Fixture — Seeded FCA Violations

Start from `clean-change.md` and apply its clean implementation update. On
`calib/run-c`, make these two additional changes.

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

`run-c` must end `REQUEST_CHANGES` with both seeded errors confirmed. General
implementation observations are out of scope.
