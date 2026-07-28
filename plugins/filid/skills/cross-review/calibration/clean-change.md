# Calibration Fixture — Clean FCA Change

This base tree and change are sound by construction. `run-a` must end `APPROVED` with no confirmed findings.

## Base Tree

`INTENT.md`:

```markdown
# fixture

## Purpose

Expose one source fractal for slug generation.

## Structure

- `src/` owns the public implementation.

## Conventions

- Route consumers through named entry points.

## Boundaries

### Always do

- Preserve the documented public surface.

### Ask first

- Add another top-level fractal.

### Never do

- Import a child implementation file from outside that child.

## Dependencies

- `src/`
```

`DETAIL.md`:

```markdown
# fixture contract

## Requirements

- Export slug generation through the root entry point.

## API Contracts

- `slugify(input)` returns a normalized slug string.

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

## Structure

- `slugify/` owns slug generation.

## Conventions

- Import child fractals through their entry points.

## Boundaries

### Always do

- Keep the source dependency graph directed.

### Ask first

- Add a shared child.

### Never do

- Re-export child internals.

## Dependencies

- `slugify/`
```

`src/DETAIL.md`:

```markdown
# source contract

## Requirements

- Expose each child through a named entry point.

## API Contracts

- `index.ts` re-exports `slugify`.

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

## Structure

- `index.ts` is the public entry; `slugify.ts` implements it.

## Conventions

- Keep transformation deterministic.

## Boundaries

### Always do

- Keep the exported signature stable.

### Ask first

- Change normalization behavior.

### Never do

- Add effects or ambient state.

## Dependencies

- None.
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
