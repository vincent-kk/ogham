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
export const SEPARATOR_INPUTS = ['Hello World', '--Hello--'];
```

This overwrite replaces the spec case added by the `run-a` clean change.

The file keeps its `.spec` suffix but holds no case. The adapter reads the content, resolves no verification role, and therefore contributes no evidence row at all — the changed verification document is absent from every evidence table. Nothing was measured about it, so nothing can be judged about it.

`run-f` must end `INCONCLUSIVE`.

## What This Fixture Regresses

This fixture is the sole calibration path where a reviewer records missing evidence for a changed file. It proves that the normal `gaps → INCONCLUSIVE` path remains active even when the same run also contains a confirmed finding.

The two seeds are chosen to sit at the same address on one axis and differ on the other:

| Item                            | Owning fractal | Rule                         |
| ------------------------------- | -------------- | ---------------------------- |
| Confirmed finding on `notes.md` | `src/slugify`  | `zero-peer-file`             |
| Gap on `tests/slugify.spec.ts`  | `src/slugify`  | verification role unresolved |

The confirmed finding does not supply the missing verification-role evidence. The gap therefore remains unresolved and the verdict is `INCONCLUSIVE` despite a confirmed finding being present.

A `REQUEST_CHANGES` result on `run-f` means the changed-file evidence gap was suppressed merely because the run also carried a confirmed finding. That regression would silently retire `INCONCLUSIVE` for partially unreviewable changes.
