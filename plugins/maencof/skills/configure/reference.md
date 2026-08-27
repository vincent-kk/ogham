# configure — Reference

Detailed scan, health check, migration, and error-handling contracts for the configure skill.

## Scan Targets

| Target           | Path                              | Purpose                       |
| ---------------- | --------------------------------- | ----------------------------- |
| MCP config       | `.mcp.json`                       | MCP server registration       |
| Project settings | `.claude/settings.json`           | Claude Code permissions       |
| Instructions     | `CLAUDE.md` / `.claude/CLAUDE.md` | AI behavioral instructions    |
| Rules            | `.claude/rules/`                  | Conditional behavior rules    |
| Skills           | `.claude/skills/`                 | Custom slash commands         |
| Agents           | `.claude/agents/`                 | Custom sub-agents             |
| Metadata         | `.maencof-meta/`                  | maencof lifecycle/config data |

Detection categories:

- **Spec violations**: invalid frontmatter, missing required fields
- **Legacy formats**: outdated structure from previous versions
- **Broken files**: JSON parse errors, @import path mismatches
- **Inactive resources**: disabled MCP servers, inactive actions

## Detailed Workflow

### Step 1 — Environment Scan

Check all config files/directories for existence, format, and spec compliance.

### Step 2 — Health Report (if issues found)

```
Configuration health check:

  [Error] .claude/rules/api-rule.md — paths frontmatter format error
  [Warning] .mcp.json — github server GITHUB_TOKEN not set
  [Info] CLAUDE.md — 247 lines (200-line guideline exceeded)
  [Info] .claude/agents/ — empty

Total: 1 error, 1 warning, 2 info items
```

### Step 3 — Migration (when applicable)

```
Migration targets found:

  [Legacy] .claude/rules/naming.md — global rule without paths frontmatter
  → Convert: add paths frontmatter or confirm as intentionally global

Proceed with migration? [Yes / No]
```

Preview changes as diffs before applying.

## Error Handling

| Condition                 | Resolution                                                |
| ------------------------- | --------------------------------------------------------- |
| maencof not initialized   | Suggest `/maencof:setup` for full setup                   |
| JSON parse error          | Identify file, create backup, offer manual merge guidance |
| Sub-skill routing failure | Provide direct instructions as fallback                   |
| Permission error          | Show `.claude/settings.json` manual edit guide            |
| @import path mismatch     | Verify file existence, suggest path correction            |

## Acceptance Criteria

- Full environment scan completed without errors
- All detected issues categorized by severity (error/warning/info)
- Correct routing to sub-skills for each intent
- Migration previewed as diff before applying
- No direct file modifications outside confirmed, previewed migrations
