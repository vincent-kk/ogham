---
name: maencof-checkup
user_invocable: true
description: "[maencof:maencof-checkup] Runs 6 comprehensive diagnostic checks across the knowledge vault covering broken links, orphan nodes, frontmatter errors, and structural inconsistencies, then provides prioritized auto-fix suggestions."
argument-hint: "[--fix] [--check ITEM]"
version: "1.0.0"
complexity: medium
context_layers: [1, 2, 3, 4, 5]
orchestrator: maencof-checkup
plugin: maencof
---

# maencof-checkup — Knowledge Vault Diagnosis

Checks knowledge vault health across 6 diagnostic items and suggests auto-fixes.
Delegates detailed analysis to the checkup agent.

## When to Use This Skill

- Check overall health of the knowledge vault
- Detect broken links, orphan nodes, and Frontmatter errors all at once
- Regular vault maintenance

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

## Workflow

### Step 1 — Run Diagnostics

Delegate to the checkup agent. The agent runs `kg_status`, `kg_navigate`, `maencof_read` across all vault documents to perform 6 diagnostic checks.

### Step 2 — Generate Report

Display summary (Errors / Warnings / Info counts, auto-fixable count) and detailed findings grouped by diagnostic item.

> See **reference.md § Report Format** for the full template.

### Step 3 — Run Auto-fix

After user confirmation, execute AutoFixAction:

- Fill missing Frontmatter fields (`maencof_update`)
- Rebuild stale index (`/maencof:maencof-rebuild`)
- **L1 (01_Core/) exception**: auto-fix forbidden — guide to `/maencof:maencof-setup --step 4`

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `kg_status` | Index status, stale/orphan nodes (D1, D2) |
| `maencof_read` | Frontmatter validation (D4, D6) |
| `maencof_update` | Auto-fix Frontmatter (D4, D6) |
| `kg_navigate` | Verify link validity, detect broken links (D3) |
| `kg_search` | Tag-based search for duplicate detection (D5) |

## Options

```
/maencof:maencof-checkup [--fix] [--check <item>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--fix` | false | Run auto-fix (after confirmation) |
| `--check` | all | Run only specific diagnostic items |

### auto-insight-health

Check auto-insight system health:
- Config file exists and is valid
- Meta-prompt file exists
- Stats file integrity
- Orphaned auto-insight documents (no links, >30 days old)
- Session capture limits appropriateness

## Resources

- **reference.md**: 6 diagnostic items detail, report format template, auto-fix rules
