# Evidence Phase — Snapshot-Backed FCA Evidence

## Inputs

- absolute `PROJECT_ROOT`
- `BASE_REF`
- `BRANCH`
- `REVIEW_DIR` from `review_state`
- prepared `SOURCE_HASH`
- committed changed-file list from `BASE_REF..HEAD`

## Required Calls

Run the following read-only MCP calls against the same unchanged project:

```text
mcp__plugin_filid_tools__fractal_scan({
  path: PROJECT_ROOT,
  detail: "full"
})

mcp__plugin_filid_tools__structure_validate({
  path: PROJECT_ROOT,
  mode: "project",
  scopes: [
    "documents",
    "nodes",
    "entry-points",
    "boundaries",
    "dag",
    "verification"
  ]
})

mcp__plugin_filid_tools__verification_scan({
  path: PROJECT_ROOT,
  detail: "files"
})
```

Preserve each envelope's status, summary, diagnostics, inline data, and artifact
metadata. If full data is persisted, read it immediately and copy every
changed-scope row into the canonical evidence files.

## Scope Projection

Build these module-scope sets before calling reviewers:

- changed files from `git diff --name-only BASE_REF..HEAD`;
- owning fractals from snapshot nodes;
- changed contract documents;
- changed public entry points;
- changed verification documents.

Keep findings that intersect a changed file or owning fractal. Record all other
tool findings under `Out-of-scope observations`; they never become candidates.

## Identity and Completeness Gate

The snapshot hash from all three summaries must be identical. Record the shared
value as `SNAPSHOT_HASH`.

Retry the complete evidence phase once when:

- hashes differ;
- an envelope is missing;
- an artifact cannot be read;
- a required changed-scope result is `indeterminate` or `unsupported` because of
  a transient tool failure.

After the retry, preserve unresolved status in the evidence file. Do not turn an
empty or unsupported result into `ok`.

## `verification.md`

Write a skeleton first and set `evidence_complete` last:

```markdown
---
source_hash: <SOURCE_HASH>
snapshot_hash: <SNAPSHOT_HASH or unavailable>
evidence_complete: true | false
fractal_scan_status: ok | violations | indeterminate | unsupported
verification_scan_status: ok | violations | indeterminate | unsupported
created_at: <ISO 8601>
---

## Changed Scope

| Path | Change | Owning Fractal |
| ---- | ------ | -------------- |

## Snapshot Summary

<fractal_scan summary, diagnostics, adapter IDs, and artifact metadata>

## Contract Evidence

| Fractal | INTENT.md | DETAIL.md | Entry Surface | Evidence |
| ------- | --------- | --------- | ------------- | -------- |

## Verification Evidence

| Role | Files | Known Cases | Cap | Findings | Certainty |
| ---- | ----- | ----------- | --- | -------- | --------- |

## Changed-Scope Verification Findings

| Path | Rule | Severity | Evidence |
| ---- | ---- | -------- | -------- |

## Out-of-scope Observations

<rows or `none`>
```

## `structure-check.md`

```markdown
---
source_hash: <SOURCE_HASH>
snapshot_hash: <SNAPSHOT_HASH or unavailable>
structure_validate_status: ok | violations | indeterminate | unsupported
evidence_complete: true | false
created_at: <ISO 8601>
---

## Scope Summary

<structure_validate summary and diagnostics>

## Changed-Scope Findings

| Path | Scope | Rule | Severity | Message | Evidence |
| ---- | ----- | ---- | -------- | ------- | -------- |

## DAG Evidence

<changed-scope edges, cycles, and certainty>

## Out-of-scope Observations

<rows or `none`>
```

Set both completion sentinels only after every retained row has been copied.
Reviewers cite these files rather than ephemeral tool output.
