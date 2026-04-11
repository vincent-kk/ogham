# filid-enrich-docs — Usage Examples

Concrete invocation patterns for the INTENT.md enrichment skill. Load this
file when you need to pick an invocation style that matches a user intent or
CI environment. For the workflow itself see [SKILL.md](./SKILL.md); for
argument defaults see [tables.md](./tables.md); for detailed per-stage
mechanics see [reference.md](./reference.md).

## Quick Invocation Patterns

### Full project audit + enrichment (interactive)

```bash
/filid:filid-enrich-docs .
```

- Walks the entire project starting at cwd.
- Stops at Stage 5 to ask for approval via `AskUserQuestion`.
- Uses default `--min-quality 70`.
- Best fit: first-time audit after initial `filid-setup`.

### Module-scoped dry run

```bash
/filid:filid-enrich-docs packages/filid/src/core --dry-run
```

- Scores every INTENT.md under `src/core`.
- Prints the plan (classification counts, per-file axes to rewrite,
  implementation files each enrichment will read) and exits.
- Makes zero writes. Safe to run as a quality report.
- Best fit: investigating whether a submodule needs a cleanup pass.

### CI-friendly background run

```bash
/filid:filid-enrich-docs packages/filid/src --min-quality 60 --auto-approve
```

- Relaxed threshold only rewrites the clearly empty or boilerplate files.
- `--auto-approve` bypasses Stage 5 — required inside non-interactive CI.
- Emits the standard consolidated report on exit.
- Best fit: nightly docs-quality job.

### Strict deep pass including DETAIL.md

```bash
/filid:filid-enrich-docs packages/filid --min-quality 80 --include-detail
```

- Uses the stricter 80-point threshold, so moderately sparse files are
  upgraded.
- `--include-detail` extends the audit rubric to DETAIL.md with the
  `Requirements` / `API Contracts` / `Last Updated` axes.
- Interactive — the plan is reviewed before writes.
- Best fit: pre-release documentation pass.

### Shallow audit limited to one depth level

```bash
/filid:filid-enrich-docs packages/maencof/src --depth 1 --dry-run
```

- Scores only INTENT.md files directly under `src/` (not its descendants).
- Combined with `--dry-run` to preview scope.
- Best fit: quick sanity check of a top-level module boundary.

## Natural-language Equivalents

Options are LLM-interpreted hints, not strict CLI flags. These phrasings are
equally valid invocations — the skill parses them into the same argument set:

| Natural phrasing                                       | Equivalent flags                        |
| ------------------------------------------------------ | --------------------------------------- |
| "core 디렉토리 품질만 미리 보여줘"                    | `packages/filid/src/core --dry-run`     |
| "RICH은 건너뛰고 나머지만 빡세게 보강해"              | `--min-quality 80`                      |
| "CI에서 돌릴거니까 확인 없이 진행"                     | `--auto-approve`                        |
| "DETAIL.md까지 같이 채워줘"                           | `--include-detail`                      |
| "한 depth만 훑어봐"                                   | `--depth 1`                             |

## Report Snippets

### Normal interactive run

```
## Enrich-docs Report — packages/filid/src/core

**Date**: 2026-04-12T03:14:22Z
**Mode**: normal
**Target**: /Users/.../packages/filid/src/core
**Language**: ko

### Discovery
INTENT.md files discovered: 14
Fractal modules: 14, Organ modules skipped: 4

### Quality Audit
RICH:    6 (score >= 70)
SPARSE:  5
MISSING: 3
Average score: 58/100

### Enrichment
Status: APPLIED
Batches dispatched: 2
Files accepted: 7
Files needing rework: 1
Files errored: 0

Enrich-docs complete: 7 files enriched
```

### Dry-run exit

```
Status: DRY_RUN
Enrich-docs dry-run complete
```

### Early exit when nothing to do

```
Status: SKIPPED_ALL_RICH
Enrich-docs skipped: all RICH
```

## Integration Hints

- Running immediately before `/filid:filid-review` raises the signal-to-noise
  ratio of the review committee's context.
- Running after `/filid:filid-restructure` or `/filid:filid-sync` re-aligns
  INTENT.md content with any directories that moved, since the scoring axes
  reference the concrete child directories and source files.
- Do not chain `filid-enrich-docs` inside `filid-update` — the two skills
  deliberately stay on separate triggers (git diff vs path + quality), and
  `filid-update` already has its own doc-sync stage for diff-affected files.
