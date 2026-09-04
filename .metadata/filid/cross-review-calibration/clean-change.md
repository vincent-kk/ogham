# Calibration Fixture — Clean FCA Change

This base tree and change are sound by construction. `run-a` must end `APPROVED` with no confirmed findings.

## Base Tree

`INTENT.md`:

```markdown
# fixture

## Purpose

Expose one source fractal for slug generation.

## Conventions

- Route consumers through named entry points.

## Boundaries

### Always do

- Preserve the documented public surface.

### Ask first

- Add another top-level fractal.

### Never do

- Import a child implementation file from outside that child.
```

`DETAIL.md`:

```markdown
# fixture contract

## Requirements

- Export slug generation through the root entry point.

## API Contracts

- `slugify(input)` returns a normalized slug string.

## Acceptance Criteria

### AC-fixture-surface — root entry surface

- `index.ts` exports `slugify` and nothing else.

## Last Updated

2026-07-27
```

`index.ts`:

```typescript
export { slugify } from './src/index.js';
```

`src/INTENT.md`:

```markdown
# src

## Purpose

Own source fractals.

## Conventions

- Import child fractals through their entry points.

## Boundaries

### Always do

- Keep the source dependency graph directed.

### Ask first

- Add a shared child.

### Never do

- Re-export child internals.
```

`src/DETAIL.md`:

```markdown
# source contract

## Requirements

- Expose each child through a named entry point.

## API Contracts

- `index.ts` re-exports `slugify`.

## Acceptance Criteria

### AC-src-surface — child entry surfaces

- Every child fractal is reached through its own entry point, never an internal file.

## Last Updated

2026-07-27
```

`src/index.ts`:

```typescript
export { slugify } from './slugify/index.js';
```

`src/slugify/INTENT.md`:

```markdown
# slugify

## Purpose

Generate URL-safe slugs without I/O.

## Conventions

- Keep transformation deterministic.

## Boundaries

### Always do

- Keep the exported signature stable.

### Ask first

- Change normalization behavior.

### Never do

- Add effects or ambient state.
```

`src/slugify/DETAIL.md`:

```markdown
# slugify contract

## Requirements

- Lowercase input and collapse separator runs.
- Trim separators at both edges.
- Limit output to 64 characters.

## API Contracts

- `slugify(input: string): string` is exported from `index.ts`.

## Acceptance Criteria

### AC-slugify-normalization — slug normalization

- Mixed-case input lowercases, separator runs collapse, and edge separators are trimmed.
- Output never exceeds 64 characters.

## Last Updated

2026-07-27
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

`src/slugify/tests/slugify.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('normalizes words', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('trims separators', () => {
    expect(slugify('--Hello--')).toBe('hello');
  });
});
```

## Clean Change

On `calib/run-a`, overwrite only `src/slugify/slugify.ts`:

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

The change preserves contracts, entry surfaces, node placement, dependency direction, and verification-document policy.

## Base Tree Conformance

`structure_validate` over the base tree must report zero violations before any run is scored. Every `DETAIL.md` above therefore carries all four required sections — a missing `## Acceptance Criteria` raises a `detail-document-contract` error inside the owning fractal of whatever the branch changes, which lands in scope and defeats `run-a` and `run-g`. Verify the base commit before branching; a fixture whose base already fails is not an oracle.
