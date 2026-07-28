# enrich-docs — Usage Examples

Examples for the workflow in [SKILL.md](./SKILL.md).

## Interactive project audit

```bash
/filid:enrich-docs .
```

The skill builds snapshot and context evidence, displays the proposed document edits, and waits for approval before the LLM writes.

## Module-scoped dry run

```bash
/filid:enrich-docs plugins/filid/src/core --dry-run
```

This prints classifications, evidence paths, and planned sections without changing files.

## Include DETAIL.md

```bash
/filid:enrich-docs plugins/filid/src --include-detail --min-quality 80
```

DETAIL.md is evaluated against its required contract anchors. The INTENT.md 50-line cap does not apply to DETAIL.md.

## Explicit non-interactive approval

```bash
/filid:enrich-docs plugins/filid/src --auto-approve
```

The flag authorizes only the evidence-backed plan displayed by this invocation. It does not broaden the write scope.

## Report Example

```text
## Enrich-docs Report — plugins/filid/src/core

Snapshot: 3a74...
Mode: interactive
RICH: 6
SPARSE: 2
MISSING: 1
Approved writes: 3
Accepted: 3
Needs rework: 0

Enrich-docs complete: 3 files enriched
```

When every document is already RICH, the report ends with:

```text
Enrich-docs skipped: all RICH
```
