# Calibration Fixture — Clean Change

> Base tree + a clean one-file change, sound by construction. A calibrated
> `--solo` review of this branch MUST end `Review verdict: APPROVED` with
> zero blocking findings. Run protocol: [calibration.md §2](./calibration.md)
> (this variant is run id `run-a`).

## 1. Base Tree (commit on `main`)

`package.json`:

```json
{
  "name": "filid-calibration-fixture",
  "version": "0.0.0",
  "private": true,
  "type": "module"
}
```

`.filid/config.json` — registers `package.json` as an allowed root peer
file so the base tree passes `zero-peer-file` by construction:

```json
{
  "version": "1.0",
  "rules": {},
  "additional-allowed": ["package.json"]
}
```

`INTENT.md` (repository root):

```markdown
# filid-calibration-fixture

## Purpose

Synthetic fixture repository for filid review calibration runs.

## Boundaries

### Always do

- Keep the tree minimal — one child fractal (`src/`).

### Ask first

- Adding files outside `src/`.

### Never do

- Adding runtime dependencies.
```

`index.ts` (repository root — satisfies `module-entry-point` on the root
fractal):

```typescript
export { slugify } from './src/index.js';
```

`src/INTENT.md`:

```markdown
# src

## Purpose

Source root for the calibration fixture. Single child fractal: `slugify/`.

## Boundaries

### Always do

- Route external imports through `index.ts`.

### Ask first

- Adding a new child fractal.

### Never do

- Adding runtime dependencies.
```

`src/index.ts`:

```typescript
export { slugify } from './slugify/index.js';
```

`src/slugify/INTENT.md`:

```markdown
# slugify

## Purpose

URL-safe slug generation. Pure string transformation, no I/O.

## Boundaries

### Always do

- Keep `slugify` pure and side-effect free.

### Ask first

- Changing the public signature of `slugify`.

### Never do

- Adding I/O, network calls, or environment access.
```

`src/slugify/index.ts`:

```typescript
export { slugify } from './slugify.js';
```

`src/slugify/slugify.ts`:

```typescript
const MAX_SLUG_LENGTH = 64;

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.slice(0, MAX_SLUG_LENGTH);
}
```

`src/slugify/tests/slugify.spec.ts` — the spec lives in a `tests/` organ
(known organ name), NOT as a fractal-root peer file; `__tests__` is avoided
because the double-underscore form trips the `naming-convention` rule:

```typescript
import { describe, expect, it } from 'vitest';

import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips leading and trailing separators', () => {
    expect(slugify('--Hello--')).toBe('hello');
  });

  it('truncates long input to 64 characters', () => {
    expect(slugify('a'.repeat(80)).length).toBeLessThanOrEqual(64);
  });
});
```

## 2. Changed File (commit on `calib/run-a`)

Overwrite `src/slugify/slugify.ts` only — truncation could leave a trailing
hyphen; strip it after slicing. No interface change:

```typescript
const MAX_SLUG_LENGTH = 64;

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '');
}
```

## 3. Soundness by Construction

- One changed file, one fractal, no interface change (TRIVIAL-tier shape).
- The base tree passes **all 8 built-in structural rules with zero
  violations** (`mcp__plugin_filid_t__structure_validate` on the materialized tree:
  `violations: [], failed: 0, rulesApplied: 8`): naming-convention,
  organ-no-intentmd, index-barrel-pattern, module-entry-point (root
  `index.ts`), max-depth, circular-dependency, pure-function-isolation,
  and zero-peer-file (spec in the `tests/` organ; `package.json` via
  `additional-allowed`).
- CC ≈ 1, LCOM4 = 1, spec has 3 cases (3+12 satisfied), no secret,
  INTENT.md files well under the 50-line cap.
- Any blocking finding (severity >= MEDIUM) raised on this branch is a
  false positive by definition.
