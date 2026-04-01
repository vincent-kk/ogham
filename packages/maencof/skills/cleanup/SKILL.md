---
name: cleanup
user_invocable: true
description: Use when you need to delete vault documents from Layer 2 through Layer 5, or when you want to inspect and remove the maencof-managed section from CLAUDE.md. Handles two distinct cleanup domains: safely removing individual knowledge documents from the vault and managing maencof-injected configuration sections within the project instruction file.
version: "1.0.0"
complexity: simple
context_layers: [2, 3, 4, 5]
orchestrator: cleanup skill
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
| "buffer", "stale buffer" keyword | **buffer-cleanup** mode |
| not specified | ask user to select mode |

## Workflow

### document mode — Vault Document Deletion

1. **Identify target** — resolve from path, keyword search (`kg_search`), or ask user
2. **Preview** — read target with `maencof_read`, show Frontmatter summary
3. **Safety checks** — L1 (01_Core/) deletion is forbidden; backlink check via `kg_navigate`
4. **Execute** — `maencof_delete` after user confirmation (or `--force`)
5. **Report** — show deleted path and recommend `/maencof:rebuild`

> See **reference.md § Document Mode** for detailed safety check flows and report format.

### buffer-cleanup mode — L5-Buffer Stale Item Cleanup

1. **Scan** `05_Context/buffer/` for documents older than `--max-age` days (default: 30)
2. **List** stale buffer items with creation date, tags, and connection count
3. **Recommend action** per item: promote (to L2/L3 with sub-layer), archive, or delete
4. **Execute** after user confirmation — uses `maencof_move` (promote) or `maencof_delete` (delete)

### claudemd mode — CLAUDE.md Section Management

- **read**: `claudemd_read()` — display current maencof section
- **remove**: `claudemd_remove(dry_run: true)` → confirm → `claudemd_remove(dry_run: false)`

> See **reference.md § CLAUDE.md Mode** for detailed steps.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `maencof_delete` | Delete vault document (document mode) |
| `maencof_read` | Preview document before deletion (document mode) |
| `kg_search` | Keyword search to identify deletion target (document mode) |
| `kg_navigate` | Check inbound links / backlink warnings (document mode) |
| `maencof_move` | Promote buffer items to target layer (buffer-cleanup mode) |
| `claudemd_read` | Read CLAUDE.md maencof section (claudemd mode) |
| `claudemd_remove` | Remove CLAUDE.md maencof section (claudemd mode) |

## Options

```
/maencof:cleanup [mode] [path] [--force] [--dry-run] [--max-age <days>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | interactive | `document`, `buffer-cleanup`, or `claudemd` |
| `path` | none | Target document path (document mode only) |
| `--force` | false | Skip backlink warning (document mode only) |
| `--dry-run` | false | Preview without executing (claudemd remove only) |
| `--max-age` | 30 | Max age in days for buffer-cleanup mode |

## Usage Examples

```
/maencof:cleanup document 04_Action/expired-task.md
/maencof:cleanup document 03_External/old-reference.md --force
/maencof:cleanup claudemd read
/maencof:cleanup claudemd remove --dry-run
/maencof:cleanup buffer --max-age 14
/maencof:cleanup buffer --dry-run
```

## Resources

- **reference.md**: Document mode detail (L1 check, backlink flow), CLAUDE.md mode detail, error handling
