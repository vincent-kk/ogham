---
name: maencof-checkup
user_invocable: true
description: "[maencof:maencof-checkup] Runs 6 comprehensive diagnostic checks across the knowledge vault covering broken links, orphan nodes, frontmatter errors, and structural inconsistencies, then provides prioritized auto-fix suggestions. Use --quick for a lightweight read-only status check that short-circuits to mcp_t_kg_status only (absorbs the former maencof-diagnose skill)."
argument-hint: "[--fix] [--quick] [--verbose] [--check ITEM]"
version: "1.1.0"
complexity: medium
context_layers: [1, 2, 3, 4, 5]
orchestrator: checkup
plugin: maencof
---

# maencof-checkup — Knowledge Vault Diagnosis

Checks knowledge vault health across 6 diagnostic items and suggests auto-fixes.
Delegates detailed analysis to the checkup agent.
Also supports a lightweight `--quick` mode that short-circuits to a single
`mcp_t_kg_status` call and renders a compact health report (absorbs the former
`maencof-diagnose` skill).

## When to Use This Skill

- Check overall health of the knowledge vault
- Detect broken links, orphan nodes, and Frontmatter errors all at once
- Regular vault maintenance
- Quick lightweight index status check (`--quick`) — index freshness, stale node ratio, sub-layer distribution
- Pre-flight status check before search/exploration (`--quick`)
- Simple pre-check before running the full `/maencof:maencof-checkup` (`--quick`)

## Prerequisites

- The maencof vault must be initialized
- If not initialized: guide to run `/maencof:maencof-setup`

## Agent Collaboration

```
[checkup skill] → [checkup agent] → DiagnosticResult
                                 → classify auto-fixable items
                                 → user confirmation → run auto-fix
```

The checkup skill delegates to the checkup agent for 6 diagnostics:
orphan-node, stale-index, broken-link, layer-mismatch, duplicate, invalid-frontmatter.

> See **reference.md** for diagnostic item details, severity levels, and auto-fix rules.

## Workflow (full mode)

### Step 1 — Run Diagnostics

Delegate to the checkup agent. The agent runs `mcp_t_kg_status`, `mcp_t_kg_navigate`, `mcp_t_read` across all vault documents to perform 6 diagnostic checks.

### Step 2 — Generate Report

Display summary (Errors / Warnings / Info counts, auto-fixable count) and detailed findings grouped by diagnostic item.

> See **reference.md § Report Format** for the full template.

### Step 3 — Run Auto-fix

After user confirmation, execute AutoFixAction:

- Fill missing Frontmatter fields (`mcp_t_update`)
- Rebuild stale index (`/maencof:maencof-build --force --reset-cache`)
- **L1 (01_Core/) exception**: auto-fix forbidden — guide to `/maencof:maencof-setup --step 4`

## --quick Mode

When `--quick` is specified, checkup short-circuits to a lightweight index status check:

- Skip the 6-check agent delegation entirely (no file-level scan, no auto-fix)
- Call only `mcp_t_kg_status`
- Render a compact health report (Healthy / Caution / Critical) with sub-layer distribution from the `subLayerDistribution` field
- With `--verbose`: additionally list stale node paths (up to 10), Layer distribution, and sub-layer consistency warnings

`--quick` is read-only. It cannot auto-fix; pair it with the full `checkup` (no flag) when remediation is needed.

> See **reference.md § --quick Mode** for report format templates, action matrix, and verbose detail.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp_t_kg_status` | Index status, stale/orphan nodes (D1, D2); sole tool in `--quick` mode |
| `mcp_t_read` | Frontmatter validation (D4, D6) |
| `mcp_t_update` | Auto-fix Frontmatter (D4, D6) |
| `mcp_t_kg_navigate` | Verify link validity, detect broken links (D3) |
| `mcp_t_kg_search` | Tag-based search for duplicate detection (D5) |

## Options

```
/maencof:maencof-checkup [--fix] [--quick] [--verbose] [--check <item>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--fix` | false | Run auto-fix (after confirmation). Ignored in `--quick` mode. |
| `--quick` | false | Short-circuit to `mcp_t_kg_status` only and render a compact health report (absorbs the former `maencof-diagnose` skill) |
| `--verbose` | false | In `--quick` mode, include stale node paths, Layer distribution, and sub-layer consistency warnings |
| `--check` | all | Run only specific diagnostic items (full mode only) |

## Usage Examples

```
/maencof:maencof-checkup
/maencof:maencof-checkup --fix
/maencof:maencof-checkup --check broken-link
/maencof:maencof-checkup --quick
/maencof:maencof-checkup --quick --verbose
```

### auto-insight-health

Check auto-insight system health:
- Config file exists and is valid
- Meta-prompt file exists
- Stats file integrity
- Orphaned auto-insight documents (no links, >30 days old)
- Session capture limits appropriateness

## Migration Note

The former `maencof-diagnose` skill has been merged into this skill.
Replace any prior `maencof-diagnose` invocation with `/maencof:maencof-checkup --quick`,
and `maencof-diagnose --verbose` with `/maencof:maencof-checkup --quick --verbose`.

## Resources

- **reference.md**: 6 diagnostic items detail, report format template, auto-fix rules, `--quick` mode templates and action matrix
