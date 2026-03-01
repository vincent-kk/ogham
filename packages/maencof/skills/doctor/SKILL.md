---
name: doctor
user_invocable: true
description: 6 diagnostics + report generation + auto-fix suggestions — knowledge vault health check
version: 1.0.0
complexity: medium
context_layers: [1, 2, 3, 4, 5]
plugin: maencof
---

# doctor — Knowledge Vault Diagnosis

Checks knowledge vault health across 6 diagnostic items and suggests auto-fixes.
Delegates detailed analysis to the doctor agent.

## When to Use This Skill

- Check overall health of the knowledge vault
- Detect broken links, orphan nodes, and Frontmatter errors all at once
- Regular vault maintenance

## Prerequisites

- The maencof vault must be initialized
- If not initialized: guide to run `/maencof:setup`

## Agent Collaboration

```
[doctor skill] → [doctor agent] → DiagnosticResult
                                 → classify auto-fixable items
                                 → user confirmation → run auto-fix
```

The doctor skill delegates to the doctor agent for 6 diagnostics:
orphan-node, stale-index, broken-link, layer-mismatch, duplicate, invalid-frontmatter.

> See **reference.md** for diagnostic item details, severity levels, and auto-fix rules.

## Workflow

### Step 1 — Run Diagnostics

Delegate to the doctor agent. The agent runs `kg_status`, `kg_navigate`, `maencof_read` across all vault documents to perform 6 diagnostic checks.

### Step 2 — Generate Report

Display summary (Errors / Warnings / Info counts, auto-fixable count) and detailed findings grouped by diagnostic item.

> See **reference.md § Report Format** for the full template.

### Step 3 — Run Auto-fix

After user confirmation, execute AutoFixAction:

- Fill missing Frontmatter fields (`maencof_update`)
- Rebuild stale index (`/maencof:rebuild`)
- **L1 (01_Core/) exception**: auto-fix forbidden — guide to `/maencof:setup --step 3`

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `kg_status` | Index status, stale/orphan nodes |
| `maencof_read` | Frontmatter validation |
| `maencof_update` | Auto-fix Frontmatter |
| `kg_navigate` | Verify link validity |

## Options

```
/maencof:doctor [--fix] [--check <item>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--fix` | false | Run auto-fix (after confirmation) |
| `--check` | all | Run only specific diagnostic items |

## Resources

- **reference.md**: 6 diagnostic items detail, report format template, auto-fix rules
