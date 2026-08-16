# Calibration Fixture — Out-of-Scope Certainty

This fixture changes the **base commit**, not the branch. Materialize `clean-change.md`'s base tree, then add the files below to `main` and commit them together. Only after that, create `calib/run-g` and apply the clean implementation update from `clean-change.md` — that one file is the entire branch diff.

## Added to `main`

`src/tokenize/INTENT.md`:

```markdown
# tokenize

## Purpose

Split text into comparable tokens without I/O.

## Conventions

- Keep tokenization deterministic.

## Boundaries

### Always do

- Keep the exported signature stable.

### Ask first

- Change the token separator set.

### Never do

- Add effects or ambient state.
```

`src/tokenize/DETAIL.md`:

```markdown
# tokenize contract

## Requirements

- Split on whitespace and discard empty segments.

## API Contracts

- `tokenize(input: string): string[]` is exported from `index.ts`.

## Acceptance Criteria

### AC-tokenize-split — whitespace splitting

- Runs of whitespace produce no empty token.

## Last Updated

2026-08-04
```

`src/tokenize/index.ts`:

```typescript
export { tokenize } from './tokenize.js';
```

`src/tokenize/tokenize.ts`:

```typescript
export function tokenize(input: string): string[] {
  return input.split(/\s+/).filter((segment) => segment.length > 0);
}
```

`src/tokenize/tests/tokenize.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { tokenize } from '../tokenize.js';

function buildCases(): [string, number][] {
  return ['one', 'one two', 'one two three'].map((input) => [
    input,
    input.split(' ').length,
  ]);
}

describe('tokenize', () => {
  it.each(buildCases())('counts tokens in %s', (input, expected) => {
    expect(tokenize(input)).toHaveLength(expected);
  });
});
```

The table comes from a call, not a literal, so the counter cannot enumerate the rows. `test-record-case-cap` is reported `indeterminate` for this file, and the project-wide verification certainty aggregates to `indeterminate` with it.

Extend `src/DETAIL.md`'s `API Contracts` to state that `index.ts` re-exports `tokenize` as well, and overwrite `src/index.ts`:

```typescript
export { slugify } from './slugify/index.js';
export { tokenize } from './tokenize/index.js';
```

These keep the base tree internally consistent, so nothing here is a seeded violation.

## Branch

`calib/run-g` changes exactly one file — `src/slugify/slugify.ts`, the clean update from `clean-change.md`. Changed scope is that file and its owning fractal `src/slugify`. Nothing under `src/tokenize/` is touched.

`run-g` must end `APPROVED`, with all three perspectives `COMPLETE` and no gap recorded.

## What This Fixture Regresses

The project-wide `indeterminate` is real, and every source contributing to it sits outside changed scope. Review Scope already bars an out-of-scope _finding_ from reaching the verdict; this fixture asserts the same bar on out-of-scope _certainty_.

| Where the certainty came from | Correct handling                              |
| ----------------------------- | --------------------------------------------- |
| `src/tokenize/` — untouched   | `Out-of-scope observations`; state unaffected |
| `src/slugify/` — changed      | in scope, judged normally                     |

`structure_validate` over this tree reports exactly four rows, and all four belong under `Out-of-scope observations`:

| Rule                     | Attributed path                       | Sourced from   |
| ------------------------ | ------------------------------------- | -------------- |
| `test-record-case-cap`   | `src/tokenize/tests/tokenize.test.ts` | `src/tokenize` |
| `spec-document-case-cap` | project root                          | `src/tokenize` |
| `spec-fragmentation`     | project root                          | `src/tokenize` |
| `spec-contract-link`     | project root                          | `src/tokenize` |

The last three are the sharp part. They are project-granularity rules, so the adapter attributes them to the **project root** — an ancestor of the changed file — while every fact behind them comes from `src/tokenize/`. Scope is decided by where the certainty was sourced, not by the path the row happens to carry; judging by the attributed path alone would pull the root in and make a clean change unjudgeable. This is the shape that produced the original defect report's third structure gap.

An `INCONCLUSIVE` result on `run-g` means a perspective promoted a project-wide aggregate into its own `gaps` and set `state: INDETERMINATE` from evidence it was never asked to judge. A `REQUEST_CHANGES` result means the out-of-scope row was arbitrated as a candidate. This path is independent of the coverage exception — fixing coverage alone does not close it.
