# doctor — Reference

Detailed diagnostic items, report format, and auto-fix rules.

## 6 Diagnostic Items

| # | Item | ID | Severity | Auto-fixable |
|---|------|----|----------|-------------|
| 1 | **Orphan Node**: nodes with 0 inbound and 0 outbound links | orphan-node | warning | partially (`/maencof:suggest` to discover and add links) |
| 2 | **Stale Index** | stale-index | warning | yes (`/maencof:rebuild`) |
| 3 | **Broken Link** | broken-link | error | no (manual review required) |
| 4 | **Layer Violation**: mismatch between path directory and Frontmatter layer field | layer-mismatch | error | partially |
| 5 | **Duplicate Document**: document pairs sharing 3+ identical tags with high title similarity | duplicate | warning | partially |
| 6 | **Frontmatter Validation**: items failing FrontmatterSchema (Zod) validation | invalid-frontmatter | error | yes |

## Diagnostic Workflow Detail

### Step 1 — Run Diagnostics

Delegated to the doctor agent:

- `kg_status` → detect D1 (orphan), D2 (stale)
- `Glob "**/*.md"` → collect full file list
- `maencof_read` per file → verify D6 (Frontmatter), D4 (Layer violation)
- `kg_navigate` → validate backlink-index.json integrity → detect D3 (broken link)
- Tag similarity analysis → detect D5 (duplicate)

### Step 2 — Report Format

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
1. /maencof:rebuild — rebuild stale index
2. N broken links require manual fix
```

### Step 3 — Auto-fix Rules

Execute AutoFixAction after user confirmation:

| Action | Tool | Condition |
|--------|------|-----------|
| Fill missing Frontmatter fields | `maencof_update` | D6 items |
| Rebuild stale index | `/maencof:rebuild` | D2 items |
| Fix layer field based on path | `maencof_update` | D4 items |
| Suggest links for orphan nodes | `/maencof:suggest` | D1 items |

**Layer 1 (01_Core/) exception**: Auto-fix via `maencof_update` is forbidden for L1 files. Report the issue and guide the user to run `/maencof:setup --step 3` or edit manually.

## Error Handling

- **Doctor agent failure**: return partial results, list failed items
- **MCP server connection failure**: guide to check `.mcp.json` configuration
- **Empty vault**: "No documents found. Run `/maencof:setup` first."
