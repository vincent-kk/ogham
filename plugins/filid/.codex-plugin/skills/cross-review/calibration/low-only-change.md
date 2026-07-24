# Calibration Fixture — Low-Only Change

> The clean change carrying only golden-LOW items. A calibrated `--solo`
> review MUST end `Review verdict: APPROVED`, present it as **APPROVED
> (with notes)**, and write a `## Advisory Notes` section containing at
> least one golden-LOW item at LOW — this run exercises the advisory
> channel, so zero advisories is a regression (calibration.md §3). Any
> golden-LOW item surfaced at MEDIUM or above is a severity-inflation
> regression. Run protocol: [calibration.md §2](./calibration.md) (this
> variant is run id `run-b`); base tree:
> [clean-change.md §1](./clean-change.md).

## Changed File (commit on `calib/run-b`)

Overwrite `src/slugify/slugify.ts` only:

```typescript
const MAX_SLUG_LENGTH = 64;

export function slugify(input: string): string {
  // lowercase the input and replace every separator run with a hyphen
  const result_value = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return result_value.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '');
}
```

## Embedded Golden-LOW Items

See [seeded-violations.md](./seeded-violations.md) → Golden-LOW set for the
authoritative expectations (GL-1 snake_case local among camelCase, GL-2
redundant narration comment). Both are style/wording-class items — the
anti-inflation hard rules pin them to LOW regardless of consequence
narrative. The underlying logic is identical to the clean change and sound
by construction.
