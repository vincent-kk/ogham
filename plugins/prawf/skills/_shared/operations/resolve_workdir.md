# [OP: resolve_workdir]

Resolve the prawf output root (`WORKDIR`) and the per-paper `REVIEW_DIR` that every
prawf skill writes into. Shared by all four skills so the path contract lives in one
place instead of being repeated per skill.

## Resolution order (highest wins)

1. **`--workdir <dir>` flag** — explicit per-invocation. Natural language counts too
   ("put the outputs under ~/reviews").
2. **`PRAWF_WORKDIR` environment variable** — session-level default that survives a
   changing `pwd`. Read it once at the start of the skill.
3. **Default `./.prawf`** — cwd-relative. Identical to prior behavior when neither a
   flag nor the env var is set.

## Derived paths

```
WORKDIR     = <resolved per the order above>
REVIEW_DIR  = <WORKDIR>/review/<paper-slug>/
profiles    = <WORKDIR>/profiles/<name>.yaml      # optional custom field profiles
```

The resolved value is used verbatim as the output root — it is NOT forced to contain a
`.prawf` segment. One mechanism therefore expresses both conventions:

| Intent                         | Input                           | REVIEW_DIR                           |
| ------------------------------ | ------------------------------- | ------------------------------------ |
| Keep the `.prawf` namespace    | `--workdir /work/papers/.prawf` | `/work/papers/.prawf/review/<slug>/` |
| Custom root, the name is yours | `--workdir /work/out`           | `/work/out/review/<slug>/`           |
| Omitted (backward-compatible)  | —                               | `./.prawf/review/<slug>/`            |

## paper-slug

A short kebab-case slug derived from the paper title (or, failing that, the input
filename): lowercase, hyphen-separated, no spaces. The same slug names the review team
(`prawf-<paper-slug>`) and the per-paper directory, so one paper's outputs stay grouped.

## Used By

- `review` — P0 resolves WORKDIR before normalizing; every R1–ADJ deliverable lands in REVIEW_DIR.
- `simulate-defense` — writes `defense-session.md` into REVIEW_DIR (reuses a prior review's directory when present).
- `rebuttal` — writes `external-findings.md` + `rebuttal.md` (intermediates) and `rebuttal-letter.md` + `revision-checklist.md` (final) into REVIEW_DIR.
- `auto-fix` — reads `review-report.md` / `qa-sheet.md` from REVIEW_DIR; writes `applied-fixes.md` + `manual-fixes.md` back there.

> `rebuttal.md` is a per-run **intermediate** (the strategist's R2 defense), written by
> both `review` and `rebuttal`. When both run on one paper they share a REVIEW_DIR and the
> later run regenerates `rebuttal.md` — this is benign because no skill consumes another
> skill's `rebuttal.md` after its own run; the durable outputs are
> `review-report.md`/`qa-sheet.md` (review) and `rebuttal-letter.md`/`revision-checklist.md`
> (rebuttal). To preserve both, pass distinct `--workdir` values.
