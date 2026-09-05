#!/usr/bin/env bash

set -euo pipefail

usage() {
  printf 'usage: %s <pass> <run:a|b|c|d|f|g|h>\n' "${0##*/}" >&2
  exit 2
}

fail() {
  printf 'materialize: %s\n' "$1" >&2
  exit 1
}

[[ $# -eq 2 ]] || usage
: "${SCRATCH:?SCRATCH must be the absolute validation scratch root}"

PASS=$1
RUN=$2
[[ "$PASS" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || fail "invalid pass: $PASS"
[[ "$RUN" =~ ^(a|b|c|d|f|g|h)$ ]] || fail "invalid run: $RUN"
[[ "$SCRATCH" == /* ]] || fail 'SCRATCH must be absolute'

REPO="$SCRATCH/calib/$PASS/$RUN"

case "$REPO" in
  "$SCRATCH"/calib/*/*) ;;
  *) fail "refusing unexpected target: $REPO" ;;
esac

rm -rf -- "$REPO"
mkdir -p -- "$REPO/src/slugify/tests"

cat > "$REPO/INTENT.md" <<'EOF'
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
EOF

cat > "$REPO/DETAIL.md" <<'EOF'
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
EOF

cat > "$REPO/index.ts" <<'EOF'
export { slugify } from './src/index.js';
EOF

cat > "$REPO/src/INTENT.md" <<'EOF'
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
EOF

cat > "$REPO/src/DETAIL.md" <<'EOF'
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
EOF


cat > "$REPO/src/index.ts" <<'EOF'
export { slugify } from './slugify/index.js';
EOF

cat > "$REPO/src/slugify/INTENT.md" <<'EOF'
# slugify

## Purpose

Generate URL-safe slugs without I/O.

## Conventions

- Keep transformation deterministic.

## Boundaries

### Always do

- Keep the exported signature stable.

### Ask first

- Add a second exported transform.

### Never do

- Add effects or ambient state.
EOF

cat > "$REPO/src/slugify/DETAIL.md" <<'EOF'
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
EOF

cat > "$REPO/src/slugify/index.ts" <<'EOF'
export { slugify } from './slugify.js';
EOF

cat > "$REPO/src/slugify/slugify.ts" <<'EOF'
const MAX_SLUG_LENGTH = 64;

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.slice(0, MAX_SLUG_LENGTH);
}
EOF

cat > "$REPO/src/slugify/tests/slugify.spec.ts" <<'EOF'
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
EOF

git -C "$REPO" init -q -b main
git -C "$REPO" config user.name 'Filid Calibration'
git -C "$REPO" config user.email 'filid-calibration@example.invalid'
git -C "$REPO" config commit.gpgsign false
git -C "$REPO" add -A
git -C "$REPO" commit -q -m 'materialize clean calibration base'

if [[ "$RUN" == g ]]; then
  mkdir -p -- "$REPO/src/tokenize/tests"

  cat > "$REPO/src/tokenize/INTENT.md" <<'EOF'
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
EOF

  cat > "$REPO/src/tokenize/DETAIL.md" <<'EOF'
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
EOF

  cat > "$REPO/src/tokenize/index.ts" <<'EOF'
export { tokenize } from './tokenize.js';
EOF

  cat > "$REPO/src/tokenize/tokenize.ts" <<'EOF'
export function tokenize(input: string): string[] {
  return input.split(/\s+/).filter((segment) => segment.length > 0);
}
EOF

  cat > "$REPO/src/tokenize/tests/tokenize.test.ts" <<'EOF'
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
EOF

  cat > "$REPO/src/DETAIL.md" <<'EOF'
# source contract

## Requirements

- Expose each child through a named entry point.

## API Contracts

- `index.ts` re-exports `slugify`.
- `index.ts` re-exports `tokenize`.

## Acceptance Criteria

### AC-src-surface — child entry surfaces

- Every child fractal is reached through its own entry point, never an internal file.

## Last Updated

2026-07-27
EOF

  cat > "$REPO/src/index.ts" <<'EOF'
export { slugify } from './slugify/index.js';
export { tokenize } from './tokenize/index.js';
EOF

  git -C "$REPO" add -A
  git -C "$REPO" commit -q -m 'add out-of-scope tokenize fixture to main'
fi

git -C "$REPO" switch -q -c "calib/$RUN"

cat > "$REPO/src/slugify/slugify.ts" <<'EOF'
const MAX_SLUG_LENGTH = 64;

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '');
}
EOF

cat > "$REPO/src/slugify/tests/slugify.spec.ts" <<'EOF'
import { describe, expect, it } from 'vitest';

import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('normalizes words', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('trims separators', () => {
    expect(slugify('--Hello--')).toBe('hello');
  });

  it('trims separators exposed by truncation', () => {
    expect(slugify(`${'a'.repeat(63)} b`)).toBe('a'.repeat(63));
  });
});
EOF

case "$RUN" in
  b)
    cat > "$REPO/src/slugify/notes.md" <<'EOF'
# Implementation Notes

Slug generation is deterministic.
EOF
    ;;
  c)
    cat > "$REPO/src/index.ts" <<'EOF'
export { slugify } from './slugify/slugify.js';
EOF
    cat > "$REPO/src/slugify/tests/INTENT.md" <<'EOF'
# tests

Independent documentation inside a test organ.
EOF
    ;;
  d)
    cat > "$REPO/src/slugify/DETAIL.md" <<'EOF'
# slugify contract

## Requirements

- Lowercase input and collapse separator runs.
- Export the new `toSlug` operation.

## API Contracts

- `toSlug(input: string): string` is exported from `index.ts`.

## Acceptance Criteria

### AC-slugify-normalization — slug normalization

- Mixed-case input lowercases, separator runs collapse, and edge separators are trimmed.
- Output never exceeds 64 characters.

## Last Updated

2026-07-27
EOF
    ;;
  f)
    cat > "$REPO/src/slugify/notes.md" <<'EOF'
# Implementation Notes

Slug generation is deterministic.
EOF
    cat > "$REPO/src/slugify/tests/slugify.spec.ts" <<'EOF'
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
EOF
    ;;
  h)
    cat > "$REPO/src/slugify/slugify.ts" <<'EOF'
const MAX_SLUG_LENGTH = 64;

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const truncated = normalized.slice(0, MAX_SLUG_LENGTH);
  return truncated[0].toLowerCase() + truncated.slice(1);
}
EOF
    ;;
esac

git -C "$REPO" add -A
git -C "$REPO" commit -q -m "materialize calibration run $RUN"

EXPECTED_COMMITS=2
[[ "$RUN" == g ]] && EXPECTED_COMMITS=3
ACTUAL_COMMITS=$(git -C "$REPO" rev-list --count HEAD)
[[ "$ACTUAL_COMMITS" -eq "$EXPECTED_COMMITS" ]] ||
  fail "expected $EXPECTED_COMMITS commits, found $ACTUAL_COMMITS"
[[ ! -e "$REPO/seeded-violations.md" ]] ||
  fail 'answer key leaked into scratch repository'

printf '%s\n' "$REPO"
