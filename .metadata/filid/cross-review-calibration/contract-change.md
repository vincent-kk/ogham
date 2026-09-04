# Calibration Fixture — Contract Change Mismatch

Start from `clean-change.md` and apply its clean implementation and verification update. On `calib/run-d`, overwrite `src/slugify/DETAIL.md`:

```markdown
# slugify contract

## Requirements

- Lowercase input and collapse separator runs.
- Export the new `toSlug` operation.

## API Contracts

- `toSlug(input: string): string` is exported from `index.ts`.

## Last Updated

2026-07-27
```

The committed entry point still exports `slugify` and does not export `toSlug`. The reviewer must raise `contract-entry-mismatch` in category `contract`; independent verification must confirm it from DETAIL.md and `src/slugify/index.ts`.

`run-d` must end `REQUEST_CHANGES` with exactly this seeded contract finding.
