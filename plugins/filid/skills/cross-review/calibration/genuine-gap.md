# Calibration Fixture — Genuine Evidence Gap

Start from `clean-change.md` and apply its clean implementation update. On `calib/run-f`, make these two additional changes.

Add `src/slugify/notes.md`:

```markdown
# Implementation Notes

Slug generation is deterministic.
```

This is the `run-b` seed and produces the canonical `zero-peer-file` warning.

Overwrite `src/slugify/tests/slugify.spec.ts`:

```typescript
export const SEPARATOR_INPUTS = ['Hello World', '--Hello--'];
```

The file keeps its `.spec` suffix but holds no case. The adapter reads the content, resolves no verification role, and therefore contributes no evidence row at all — the changed verification document is absent from every evidence table. Nothing was measured about it, so nothing can be judged about it.

`run-f` must end `INCONCLUSIVE`.

## What This Fixture Regresses

`run-e` proves that a covered gap stops forcing `INCONCLUSIVE`. This fixture proves the opposite half — that the normal `INCONCLUSIVE` path still works — and it is the regression that matters most, because the risk of the coverage exception is over-suppression.

The two seeds are chosen to sit at the same address on one axis and differ on the other:

| Item                            | Owning fractal | Rule                         |
| ------------------------------- | -------------- | ---------------------------- |
| Confirmed finding on `notes.md` | `src/slugify`  | `zero-peer-file`             |
| Gap on `tests/slugify.spec.ts`  | `src/slugify`  | verification role unresolved |

Coverage requires **both** to match: the same owning fractal _and_ the same rule, with `rule` compared exactly. Here the fractal matches and the rule does not, so the gap is uncovered and the verdict is `INCONCLUSIVE` despite a confirmed finding being present.

A `REQUEST_CHANGES` result on `run-f` means coverage was implemented as owning-fractal proximity alone, dropping the exact-rule half of the predicate. That regression would silently retire the `INCONCLUSIVE` verdict for any change that happens to carry one confirmed finding.
