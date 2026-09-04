# Calibration Fixture — Genuine Evidence Gap

Start from `clean-change.md` and apply its clean implementation and verification update. On `calib/run-f`, make these two additional changes.

Add `src/slugify/notes.md`:

```markdown
# Implementation Notes

Slug generation is deterministic.
```

This is the `run-b` seed and produces the canonical `zero-peer-file` warning.

Overwrite `src/slugify/tests/slugify.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { slugify } from '../slugify.js';

function loadRows(): Array<[string, string]> {
  return [
    ['Hello World', 'hello-world'],
    ['--Hello--', 'hello'],
    ['a'.repeat(63) + ' bcd', 'a'.repeat(63)],
  ];
}

describe('slugify', () => {
  it.each(loadRows())('normalizes %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
```

This overwrite preserves the three behaviors covered by the `run-a` clean change but moves the rows behind a dynamic table.

The adapter recognizes the file as a `spec-document`, but `it.each(loadRows())` is not statically enumerable. Its case count is therefore `indeterminate`, changed scope reports `verification_status: indeterminate`, and `evidence_complete` is false. The file remains in the changed-file roster as `verification`; the missing evidence is its semantic case count, not its existence or role.

`run-f` must end `INCONCLUSIVE`.

## What This Fixture Regresses

This fixture is the sole calibration path where canonical verification evidence is indeterminate for a changed file. It proves that the normal incomplete-evidence → `INCONCLUSIVE` path remains active even when the same run also contains a confirmed finding.

The two seeds are chosen to sit at the same address on one axis and differ on the other:

| Item                            | Owning fractal | Rule                             |
| ------------------------------- | -------------- | -------------------------------- |
| Confirmed finding on `notes.md` | `src/slugify`  | `zero-peer-file`                 |
| Gap on `tests/slugify.spec.ts`  | `src/slugify`  | dynamic case count indeterminate |

The confirmed finding does not supply the missing semantic-count evidence. The gap therefore remains unresolved and the verdict is `INCONCLUSIVE` despite a confirmed finding being present.

A `REQUEST_CHANGES` result on `run-f` means indeterminate canonical evidence was suppressed merely because the run also carried a confirmed finding. That regression would silently retire `INCONCLUSIVE` for partially unreviewable changes.
