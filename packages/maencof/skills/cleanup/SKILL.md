---
name: cleanup
user_invocable: true
description: Knowledge vault and CLAUDE.md cleanup — delete vault documents and read/remove maencof sections from CLAUDE.md
version: 1.0.0
complexity: simple
context_layers: [2, 3, 4, 5]
plugin: maencof
---

# cleanup — Vault and CLAUDE.md Cleanup

Manages cleanup operations across two domains: deleting vault documents and managing maencof sections in CLAUDE.md.

## When to Use This Skill

- Delete a vault document (L2-L5)
- Check or remove the maencof section in CLAUDE.md
- Keywords: "cleanup", "delete document", "remove", "uninstall maencof section"

## Prerequisites

- The maencof vault must be initialized (Layer directories must exist)
- If not initialized: "Please run `/maencof:setup` first."

## Mode Selection

| Input Pattern | Mode |
|---------------|------|
| file path or document keyword | **document** mode |
| "claudemd", "CLAUDE.md" keyword | **claudemd** mode |
| not specified | ask user to select mode |

## Workflow

### document mode — Vault Document Deletion

1. **Identify target** — resolve from path, keyword search (`kg_search`), or ask user
2. **Preview** — read target with `maencof_read`, show Frontmatter summary
3. **Safety checks** — L1 (01_Core/) deletion is forbidden; backlink check via `kg_navigate`
4. **Execute** — `maencof_delete` after user confirmation (or `--force`)
5. **Report** — show deleted path and recommend `/maencof:rebuild`

> See **reference.md § Document Mode** for detailed safety check flows and report format.

### claudemd mode — CLAUDE.md Section Management

- **read**: `claudemd_read()` — display current maencof section
- **remove**: `claudemd_remove(dry_run: true)` → confirm → `claudemd_remove(dry_run: false)`

> See **reference.md § CLAUDE.md Mode** for detailed steps.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `maencof_delete` | Delete vault document (document mode) |
| `maencof_read` | Preview document before deletion (document mode) |
| `kg_navigate` | Check inbound links / backlink warnings (document mode) |
| `claudemd_read` | Read CLAUDE.md maencof section (claudemd mode) |
| `claudemd_remove` | Remove CLAUDE.md maencof section (claudemd mode) |

## Options

```
/maencof:cleanup [mode] [path] [--force] [--dry-run]
```

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | interactive | `document` or `claudemd` |
| `path` | none | Target document path (document mode only) |
| `--force` | false | Skip backlink warning (document mode only) |
| `--dry-run` | false | Preview without executing (claudemd remove only) |

## Usage Examples

```
/maencof:cleanup document 04_Action/expired-task.md
/maencof:cleanup document 03_External/old-reference.md --force
/maencof:cleanup claudemd read
/maencof:cleanup claudemd remove --dry-run
```

## Resources

- **reference.md**: Document mode detail (L1 check, backlink flow), CLAUDE.md mode detail, error handling
