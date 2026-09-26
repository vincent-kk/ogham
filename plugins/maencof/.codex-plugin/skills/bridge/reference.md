# bridge — Reference

Pipeline, workflow configuration, generated-skill contract, and error handling for the bridge skill.

## Pipeline Diagram

```
/maencof:bridge (this skill — orchestrator)
  1. /maencof:mcp-setup     → MCP server installation
  2. /maencof:connect        → Data source registration
  3. bridge                   → Workflow skill generation
```

Each delegated skill handles its own file writes; bridge writes the workflow skill and coordinates the pipeline.

## Sub-Skill Comparison

| Skill                | Scope                                                |
| -------------------- | ---------------------------------------------------- |
| `/maencof:mcp-setup` | MCP server installation only                         |
| `/maencof:connect`   | Data source registration only                        |
| `/maencof:bridge`    | **Install + register + workflow skill — all in one** |

## Detailed Workflow

### Workflow Configuration

Collect these fields before writing the workflow skill:

- **Target**: channel, repository, project, board
- **Layer**: L1–L5 (appropriate for data type)
- **Tags**: auto-tagging keywords
- **Frequency**: every session / daily / weekly / manual
- **Processing**: raw / summary / structured

### Step 4 — Auto-Generate Workflow Skill

Write the workflow skill directly at `{CWD}/.claude/skills/{name}/SKILL.md`:

Generated skill example:

```yaml
---
name: slack-digest
user-invocable: true
description: Collect latest Slack #dev channel messages, summarize, and save to maencof L4
version: 1.0.0
---
```

```markdown
# slack-digest — Slack Channel Digest

## Workflow

1. Fetch #dev messages via mcp**slack**get_channel_messages
2. Summarize key points (5 bullets max)
3. Save to L4 via /maencof:remember (tags: slack, dev-updates)
4. Confirm save
```

### Step 5 — Register Data Source

Delegate to `/maencof:connect`:

### Step 6 — Confirmation and Test

Summarize the created files and offer an end-to-end test.

## Agent Collaboration

Executed by the **configurator** agent. Bridge delegates installation and registration to `mcp-setup` and `connect`, writes the workflow skill directly, and passes context between each step. The delegated skills run under this configurator context; their own `orchestrator` declarations apply only when invoked directly.

## Error Handling

| Condition                       | Resolution                                                         |
| ------------------------------- | ------------------------------------------------------------------ |
| MCP installation failure        | Refer to `/maencof:mcp-setup` error handling; offer manual install |
| API token not set               | Provide token acquisition guide, retry after setup                 |
| `data-sources.json` parse error | Create backup, offer regeneration                                  |
| Skill name conflict             | Show existing skill, confirm overwrite                             |
| MCP connection failure          | Verify token/permissions, suggest `/maencof:mcp-setup --verify`    |

## Acceptance Criteria

- MCP server installed and configured in `.mcp.json`
- Permissions added to `.claude/settings.json`
- Data source registered in `.maencof-meta/data-sources.json`
- Workflow skill created at `.claude/skills/{name}/SKILL.md`
- All sub-skill delegations completed successfully
- End-to-end test offered to user
