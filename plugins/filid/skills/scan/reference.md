# scan — FCA Audit Reference

This reference defines the only full-project FCA audit workflow. The workflow is read-only and uses one snapshot-oriented pass from each retained audit surface.

## Section 1 — Project Snapshot Summary

Call:

```text
mcp__plugin_filid_tools__fractal_scan({
  path: "<target-path>",
  detail: "summary"
})
```

Retain the project root, snapshot hash, adapter IDs, node counts, depth, violation count, certainty, status, and diagnostics. Do not request path or full detail for the default full audit; the validation calls provide the actionable evidence.

## Section 2 — Complete Structural Validation

Call:

```text
mcp__plugin_filid_tools__structure_validate({
  path: "<target-path>",
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
```

Omitting `scopes` also means every canonical scope, but the explicit list makes the full-audit contract reviewable. Use the returned report or its artifact as the source of structural findings. Do not infer a pass from a zero finding count when status, certainty, or diagnostics are not exact.

The structural pass covers:

- INTENT.md and DETAIL.md contracts
- node classification and organ boundaries
- entry-point presence and enumerable public surface
- external import boundaries and pure-function isolation
- dependency cycles and depth
- verification-document structural links

## Section 3 — Verification Documents

Call:

```text
mcp__plugin_filid_tools__verification_scan({
  path: "<target-path>",
  detail: "files"
})
```

On a large project this payload exceeds the inline envelope budget and is persisted instead. Use the returned report or its artifact as the source of verification findings; never treat an absent inline `data` as an empty result.

The summary keeps spec-document and test-record counts separate. Interpret their per-file caps as 15 and 32 respectively. Include fragmentation and contract-link findings. Dynamic or unsupported discovery makes the result non-exact and must remain visible.

Use `filePaths` only when the user explicitly requests a scoped diagnostic. The normal `/filid:scan` invocation omits it and audits the full project.

## Section 4 — Consolidation

Correlate results by `snapshotHash`. If hashes differ, do not merge them into a single verdict; rerun the three calls once against the unchanged target. If they still differ, return `INDETERMINATE` and report the observed hashes.

Deduplicate findings by rule ID, evidence path, and message. A finding reported by both structural and verification validation appears once with both sources noted.

Sort the report in this order:

1. non-exact status and diagnostics
2. error findings
3. warning findings
4. informational or skipped evidence

## Section 5 — Report Format

```text
FCA-AI Full Audit
=================
Target          : <project root>
Snapshot hash   : <hash>
Adapters        : <ids>
Certainty       : <certainty>
Nodes           : <counts by type>
Structural      : <finding count>
Verification    : <finding count>

ERROR (<n>)
  [<rule-id>] <evidence path>
    <message>

WARNING (<n>)
  ...

DIAGNOSTICS (<n>)
  [<code>] <path when present>
    <message>

Result: PASS | FAIL | INDETERMINATE
Scan complete: <N> findings
```

- `PASS`: all three calls are OK with exact certainty and no findings.
- `FAIL`: at least one canonical violation is present.
- `INDETERMINATE`: unsupported or ambiguous evidence prevents a reliable result and no already-confirmed violation determines `FAIL`.

The terminal marker is the final line. This skill never edits documents, source, configuration, or generated artifacts.
