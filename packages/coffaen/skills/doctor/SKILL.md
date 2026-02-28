---
name: doctor
user_invocable: true
description: 6 diagnostics + report generation + auto-fix suggestions — knowledge vault health check
version: 1.0.0
complexity: high
context_layers: [1, 2, 3, 4, 5]
orchestrator: doctor skill
plugin: coffaen
---

# doctor — Knowledge Vault Diagnosis

Checks knowledge vault health across 6 diagnostic items and suggests auto-fixes.
Delegates detailed analysis to the doctor agent.

## When to Use This Skill

- When you want to check the overall health of the knowledge vault
- When you want to check for broken links, orphan nodes, and Frontmatter errors all at once
- During regular vault maintenance

## Agent Collaboration Sequence

```
[doctor skill] -> [doctor agent] -> DiagnosticResult
                                 |
                    classify auto-fixable items
                                 |
              user confirmation -> run auto-fix (AutoFixAction)
```

**Orchestrator**: the doctor skill delegates to the doctor agent to perform 6 diagnostics.

## 6 Diagnostic Items

| # | Diagnostic Item | Severity | Auto-fixable |
|---|----------------|----------|-------------|
| 1 | **orphan node** (orphan-node) | warning | partially |
| 2 | **stale index** (stale-index) | warning | yes (`/coffaen:rebuild`) |
| 3 | **broken link** (broken-link) | error | no (manual review required) |
| 4 | **Layer violation** (layer-mismatch) | error | partially |
| 5 | **duplicate document** (duplicate) | warning | partially |
| 6 | **Frontmatter validation** (invalid-frontmatter) | error | yes |

## Workflow

### Step 1 — Run Diagnostics

Delegate 6 diagnostics to the doctor agent:
- Check stale nodes and orphan nodes via `kg_status`
- Validate backlink-index.json integrity
- Validate all .md file Frontmatter against the Zod schema
- Check Layer directory rule compliance

### Step 2 — Generate Report

```markdown
## Diagnostic Report — {date}

### Summary
- Errors: N | Warnings: N | Info: N
- Auto-fixable: N

### Detailed Diagnostics
#### Broken Links (error)
- {file}: {link} -> unreachable

#### Frontmatter Errors (error)
- {file}: missing required field 'tags'

#### Orphan Nodes (warning)
- {file}: no inbound/outbound links

### Recommended Actions
1. /coffaen:rebuild — rebuild stale index
2. N broken links require manual fix
```

### Step 3 — Run Auto-fix

Run AutoFixAction after user confirmation:
- Auto-fill missing Frontmatter fields (`coffaen_update`)
- Delegate stale index rebuild (`/coffaen:rebuild`)

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `kg_status` | Index status, stale/orphan nodes |
| `coffaen_read` | Frontmatter validation |
| `coffaen_update` | Auto-fix Frontmatter |
| `kg_navigate` | Verify link validity |

## Options

```
/coffaen:doctor [--fix] [--check <item>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--fix` | false | Run auto-fix (after confirmation) |
| `--check` | all | Run only specific diagnostic items |
