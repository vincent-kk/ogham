---
name: checkup
user_invocable: true
description: '[maencof:checkup] Runs 8 comprehensive diagnostic checks across the knowledge vault covering broken links, orphan nodes, frontmatter errors, structural inconsistencies, auto-insight system health, and missing L1 gists, then provides prioritized auto-fix suggestions. Use --quick for a lightweight read-only status check that short-circuits to mcp__plugin_maencof_t__kg_status only (absorbs the former maencof-diagnose skill).'
argument-hint: '[--fix] [--quick] [--verbose] [--check <item>]'
version: '1.1.0'
complexity: medium
context_layers: [1, 2, 3, 4, 5]
orchestrator: checkup
plugin: maencof
---

# checkup — Knowledge Vault Diagnosis

Checks knowledge vault health across 8 diagnostic items and suggests auto-fixes.
Delegates detailed analysis to the checkup agent.
Also supports a lightweight `--quick` mode that short-circuits to a single
`mcp__plugin_maencof_t__kg_status` call and renders a compact health report (absorbs the former
`maencof-diagnose` skill).

## When to Use This Skill

- Check overall health of the knowledge vault
- Detect broken links, orphan nodes, and Frontmatter errors all at once
- Regular vault maintenance
- Quick lightweight index status check (`--quick`) — index freshness, stale node ratio, sub-layer distribution
- Pre-flight status check before search/exploration (`--quick`)

## Prerequisites

- The maencof vault must be initialized
- If not initialized: guide to run `/maencof:setup`

## Agent Collaboration

```
[checkup skill] → [checkup agent] → DiagnosticResult
                                 → classify auto-fixable items
                                 → user confirmation → run auto-fix
```

The checkup skill delegates to the checkup agent for 8 diagnostics:
orphan-node, stale-index, broken-link, layer-mismatch, duplicate, invalid-frontmatter, auto-insight-health, missing-l1-gist.

> See **reference.md** for diagnostic item details, severity levels, and auto-fix rules.

## Workflow (full mode)

### Step 1 — Run Diagnostics

Delegate to the checkup agent. The agent runs `mcp__plugin_maencof_t__kg_status`, `mcp__plugin_maencof_t__kg_navigate`, `mcp__plugin_maencof_t__kg_suggest_links`, `mcp__plugin_maencof_t__read` across all vault documents and `.maencof-meta/` to perform 8 diagnostic checks.

### Step 2 — Generate Report

Display summary (Errors / Warnings / Info counts, auto-fixable count) and detailed findings grouped by diagnostic item.

> See **reference.md § Report Format** for the full template.

### Step 3 — Run Auto-fix

After user confirmation, execute AutoFixAction:

- Fill missing Frontmatter fields (`mcp__plugin_maencof_t__update`)
- Rebuild stale index (`/maencof:build --force --reset-cache`)
- **L1 (01_Core/) exception**: auto-fix forbidden — guide to `/maencof:setup --step 4`

## --quick Mode

When `--quick` is specified, checkup short-circuits to a lightweight index status check:

- Skip the 7-check agent delegation entirely (no file-level scan, no auto-fix)
- Call only `mcp__plugin_maencof_t__kg_status`
- Render a compact health report (Healthy / Caution / Critical) with sub-layer distribution from the `subLayerDistribution` field
- With `--verbose`: additionally list stale node paths (up to 10), Layer distribution, and sub-layer consistency warnings

`--quick` is read-only. It cannot auto-fix; pair it with the full `checkup` (no flag) when remediation is needed.

> See **reference.md § --quick Mode** for report format templates, action matrix, and verbose detail.

## Available MCP Tools

| Tool                                      | Purpose                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `mcp__plugin_maencof_t__kg_status`        | Index status, stale ratio, wikilink-orphan breakdown by layer/archived + paths (D1, D2); sole tool in `--quick` mode |
| `mcp__plugin_maencof_t__read`             | Frontmatter validation (D4, D6)                                                                                      |
| `mcp__plugin_maencof_t__update`           | Auto-fix Frontmatter (D4, D6)                                                                                        |
| `mcp__plugin_maencof_t__kg_navigate`      | Verify link validity, detect broken links (D3)                                                                       |
| `mcp__plugin_maencof_t__kg_search`        | Tag-based search for duplicate detection (D5)                                                                        |
| `mcp__plugin_maencof_t__kg_suggest_links` | Query-time link candidates for authored-orphan triage (D1)                                                           |

## Options

```
/maencof:checkup [--fix] [--quick] [--verbose] [--check <item>]
```

| Option      | Default | Description                                                                                                                               |
| ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--fix`     | false   | Run auto-fix (after confirmation). Ignored in `--quick` mode.                                                                             |
| `--quick`   | false   | Short-circuit to `mcp__plugin_maencof_t__kg_status` only and render a compact health report (absorbs the former `maencof-diagnose` skill) |
| `--verbose` | false   | In `--quick` mode, include stale node paths, Layer distribution, and sub-layer consistency warnings                                       |
| `--check`   | all     | Run only specific diagnostic items (full mode only)                                                                                       |

## Usage Examples

```
/maencof:checkup
/maencof:checkup --fix
/maencof:checkup --check broken-link
/maencof:checkup --quick
/maencof:checkup --quick --verbose
```

## Resources

- **reference.md**: 7 diagnostic items detail, report format template, auto-fix rules, `--quick` mode templates and action matrix
