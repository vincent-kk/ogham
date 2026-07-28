---
name: scan
user_invocable: true
description: '[filid:scan] Run the single full-project FCA audit across snapshot structure, document and import boundaries, dependency DAG, and verification-document contracts.'
argument-hint: '[path]'
version: '2.0.0'
complexity: medium
plugin: filid
---

# scan — Full FCA Audit

Run Filid's only complete FCA audit entry point. The workflow is read-only: it collects snapshot, structure, and verification evidence and returns one prioritized verdict.

See [reference.md](./reference.md) for exact calls, consolidation rules, and the report format.

## When to Use

- after implementation and refactoring are complete
- before review or integration
- after structural movement has been executed externally
- to verify a setup or migration result
- for a periodic whole-repository FCA health check

For a targeted boundary question, use `/filid:context-query`. For a proposed source-to-target structural change, use `/filid:restructure`.

## Workflow

Run all phases in one continuous operation. Large payloads and artifacts are internal evidence and are not echoed to the user.

### Phase 1 — Snapshot Summary

Call `mcp__plugin_filid_tools__fractal_scan` with `detail: "summary"`.

### Phase 2 — Full Structural Validation

Call `mcp__plugin_filid_tools__structure_validate` with `mode: "project"` and all six canonical scopes:

- `documents`
- `nodes`
- `entry-points`
- `boundaries`
- `dag`
- `verification`

### Phase 3 — Verification Documents

Call `mcp__plugin_filid_tools__verification_scan` with `detail: "files"` and without `filePaths`, so both verification roles and fragmentation links are audited across the whole project.

### Phase 4 — Consolidated Verdict

Require matching snapshot hashes, deduplicate overlapping findings, preserve all diagnostics, and sort non-exact evidence before errors and warnings.

Use:

- `PASS` only for exact, diagnostic-free, finding-free evidence
- `FAIL` when a canonical violation is confirmed
- `INDETERMINATE` when unsupported or ambiguous evidence prevents a reliable verdict and no confirmed violation already determines failure

End with `Scan complete: <N> findings`.

## MCP Surface

| Tool                                          | Purpose                                                  |
| --------------------------------------------- | -------------------------------------------------------- |
| `mcp__plugin_filid_tools__fractal_scan`       | snapshot identity, adapters, certainty, and node summary |
| `mcp__plugin_filid_tools__structure_validate` | complete FCA structural rule evaluation                  |
| `mcp__plugin_filid_tools__verification_scan`  | per-role case caps, fragmentation, and contract links    |

## Invariants

- Scan does not edit source, documents, config, or generated artifacts.
- Spec-document and test-record counts remain separate.
- Per-file caps are 15 for spec documents and 32 for test records.
- Warning findings count as findings.
- Non-exact evidence is never reported as a clean pass.
