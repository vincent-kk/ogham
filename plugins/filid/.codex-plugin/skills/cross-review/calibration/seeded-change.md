# Calibration Fixture — Seeded Change

> The clean change with two seeded blocking defects plus the golden-LOW
> items. A calibrated `--solo` review MUST end
> `Review verdict: REQUEST_CHANGES` — SV-1 is a VETO-class defect and is
> gate-independent. Expected detections:
> [seeded-violations.md](./seeded-violations.md). Run protocol:
> [calibration.md §2](./calibration.md) (this variant is run id `run-c`);
> base tree: [clean-change.md §1](./clean-change.md).

## Changed File (commit on `calib/run-c`)

Overwrite `src/slugify/slugify.ts` only:

```typescript
const MAX_SLUG_LENGTH = 64;
const SLUG_SIGNING_KEY = 'sk-live-4f9d2c81e7a35b06';

export function slugify(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Error occurred');
  }
  // lowercase the input and replace every separator run with a hyphen
  const result_value = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return result_value.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '');
}
```

Everything not listed in the manifest is unchanged in substance relative to
the clean change and should NOT produce blocking findings.
