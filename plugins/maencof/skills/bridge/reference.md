# bridge — Reference

Detailed workflow, pipeline diagram, service examples, and error handling for the bridge skill.

## Pipeline Diagram

```
/maencof:bridge (this skill — orchestrator)
  1. /maencof:mcp-setup     → MCP server installation
  2. /maencof:connect        → Data source registration
  3. /maencof:craft-skill    → Workflow skill generation
```

Each sub-skill handles its own file writes. Bridge coordinates the pipeline and passes context between steps.

## Sub-Skill Comparison

| Skill | Scope |
|-------|-------|
| `/maencof:mcp-setup` | MCP server installation only |
| `/maencof:connect` | Data source registration only |
| `/maencof:bridge` | **Install + register + workflow skill — all in one** |

## Detailed Workflow

### Step 1 — Discovery

Read `.mcp.json` to identify installed/available MCP servers:

```
Installed MCP servers:
  [Installed] github — @modelcontextprotocol/server-github
  [Not installed] slack
  [Not installed] jira

Which service would you like to connect?
  [ ] Slack
  [ ] Jira / Confluence (Atlassian)
  [ ] Notion
  [ ] Linear
  [ ] Enter manually...
```

Already-installed servers skip to workflow definition (Step 3).

### Step 2 — MCP Installation

Delegate to `/maencof:mcp-setup`:

```
Installing Slack MCP server...
  → Delegating to /maencof:mcp-setup

Done:
  - .mcp.json updated
  - .claude/settings.json permissions added
  - SLACK_BOT_TOKEN setup instructions provided
```

### Step 3 — Workflow Definition (Conversational)

```
How would you like to use Slack?

  "Summarize #dev channel messages daily and save to L4"

Configuration:
  Channel: #dev
  Frequency: Every session start
  Storage layer: L4 (Action Memory, volatile)
  Tags: slack, dev-updates
  Processing: Bullet-point summary, markdown format

Proceed? [Yes / Edit]
```

Configurable fields:
- **Target**: channel, repository, project, board
- **Layer**: L1–L5 (appropriate for data type)
- **Tags**: auto-tagging keywords
- **Frequency**: every session / daily / weekly / manual
- **Processing**: raw / summary / structured

### Step 4 — Auto-Generate Workflow Skill

Delegate to `/maencof:craft-skill`:

```
Generating workflow skill...

  Name: slack-digest
  Location: {CWD}/.claude/skills/slack-digest/SKILL.md
  Function: Collect #dev messages → summarize → save to L4
```

Generated skill example:
```yaml
---
name: slack-digest
user_invocable: true
description: Collect latest Slack #dev channel messages, summarize, and save to maencof L4
version: 1.0.0
---
```

```markdown
# slack-digest — Slack Channel Digest

## Workflow
1. Fetch #dev messages via mcp__slack__get_channel_messages
2. Summarize key points (5 bullets max)
3. Save to L4 via /maencof:remember (tags: slack, dev-updates)
4. Confirm save
```

### Step 5 — Register Data Source

Delegate to `/maencof:connect`:

```
Registering data source...

Done:
  ID: slack-dev
  Frequency: Every session
  Linked skill: slack-digest
```

### Step 6 — Confirmation and Test

```
Bridge setup complete!

Connected services:
  Slack (#dev) — every session
    → Run: /maencof:slack-digest

Created files:
  .mcp.json (slack server added)
  .claude/settings.json (permissions added)
  .maencof-meta/data-sources.json (slack-dev registered)
  .claude/skills/slack-digest/SKILL.md (workflow skill)

Test now? [Yes / Later]
```

## Agent Collaboration

Executed by the **configurator** agent. Bridge orchestrates three sub-skills in sequence, passing context between each step.

## Usage Examples

```
/maencof:bridge
/maencof:bridge slack
/maencof:bridge github
```

Natural language:
```
"Connect Jira and set up a sprint summary workflow"
"Install the Slack MCP and create a daily digest skill"
"I want to pull GitHub issues into maencof automatically"
```

## Error Handling

| Condition | Resolution |
|-----------|------------|
| MCP installation failure | Refer to `/maencof:mcp-setup` error handling; offer manual install |
| API token not set | Provide token acquisition guide, retry after setup |
| `data-sources.json` parse error | Create backup, offer regeneration |
| Skill name conflict | Show existing skill, confirm overwrite |
| MCP connection failure | Verify token/permissions, suggest `/maencof:mcp-setup --verify` |

## Acceptance Criteria

- MCP server installed and configured in `.mcp.json`
- Permissions added to `.claude/settings.json`
- Data source registered in `.maencof-meta/data-sources.json`
- Workflow skill created at `.claude/skills/{name}/SKILL.md`
- All sub-skill delegations completed successfully
- End-to-end test offered to user
