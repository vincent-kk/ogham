# Calibration Fixture — Seeded Empty-Boundary Bug

Materialize the base tree from `clean-change.md`. On `calib/run-h`, overwrite only `src/slugify/slugify.ts`:

```typescript
const MAX_SLUG_LENGTH = 64;

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const truncated = normalized.slice(0, MAX_SLUG_LENGTH);
  return truncated[0].toLowerCase() + truncated.slice(1);
}
```

For every non-empty normalized value, the added first-character operation preserves the base result. For an empty string, `truncated[0]` is `undefined`, and calling `toLowerCase()` throws because the implementation reads the first character without checking the length.

`run-h` must end `REQUEST_CHANGES` with exactly one seeded finding:

- category: `bug`
- severity: `error`
- path: `src/slugify/slugify.ts`
- rule: `rules/default.md` item `DEF-2 — Boundaries`
- expected verification: `CONFIRMED`

No contract, structure, test, or documentation defect is seeded by this branch.
