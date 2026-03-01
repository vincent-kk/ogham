# configure — Reference

Detailed workflow, routing table, health check format, and error handling for the configure skill.

## Scan Targets

| Target | Path | Purpose |
|--------|------|---------|
| MCP config | `.mcp.json` | MCP server registration |
| Project settings | `.claude/settings.json` | Claude Code permissions |
| Instructions | `CLAUDE.md` / `.claude/CLAUDE.md` | AI behavioral instructions |
| Rules | `.claude/rules/` | Conditional behavior rules |
| Skills | `.claude/skills/` | Custom slash commands |
| Agents | `.claude/agents/` | Custom sub-agents |
| Metadata | `.maencof-meta/` | maencof lifecycle/config data |

Detection categories:
- **Spec violations**: invalid frontmatter, missing required fields
- **Legacy formats**: outdated structure from previous versions
- **Broken files**: JSON parse errors, @import path mismatches
- **Inactive resources**: disabled MCP servers, inactive actions

## Routing Table

| Intent | Target Skill | Description |
|--------|-------------|-------------|
| MCP server install/connect | `/maencof:bridge` | Install + workflow integration |
| Skill creation | `/maencof:craft-skill` | SKILL.md auto-generation |
| Agent creation | `/maencof:craft-agent` | Agent .md auto-generation |
| CLAUDE.md editing | `/maencof:instruct` | Safe instruction management |
| Rule management | `/maencof:rule` | Conditional rule CRUD |
| Hook management | `/maencof:lifecycle` | Dynamic action registration |
| Migration | Handled directly | Legacy format → current spec |

Natural language routing:

| User Expression | Route |
|----------------|-------|
| "Connect GitHub" | `/maencof:bridge` |
| "Always respond in Korean" | `/maencof:instruct` |
| "Create a test agent" | `/maencof:craft-agent` |
| "Add a rule for API files" | `/maencof:rule` |
| "Something seems broken" | Health report |

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

### Step 3 — Identify Intent

```
What would you like to configure?

  1. MCP server setup         → /maencof:bridge
  2. Create a custom skill    → /maencof:craft-skill
  3. Create a custom agent    → /maencof:craft-agent
  4. Edit CLAUDE.md           → /maencof:instruct
  5. Manage rules             → /maencof:rule
  6. Manage lifecycle hooks   → /maencof:lifecycle
  7. Run migration            → handled directly
  8. Auto-fix detected issues
```

### Step 4 — Route to Sub-Skill

Delegate to the matched skill. All file modifications are handled by sub-skills.

### Step 5 — Migration (when applicable)

```
Migration targets found:

  [Legacy] .claude/rules/naming.md — global rule without paths frontmatter
  → Convert: add paths frontmatter or confirm as intentionally global

Proceed with migration? [Yes / No]
```

Preview changes as diffs before applying.

## Agent Collaboration

Executed by the **configurator** agent. The configurator handles scan, diagnosis, and routing. All file modifications are delegated to sub-skills.

```
configurator agent
  → /maencof:configure (this skill — scan + route)
    → /maencof:bridge (MCP)
    → /maencof:craft-skill (skills)
    → /maencof:craft-agent (agents)
    → /maencof:instruct (CLAUDE.md)
    → /maencof:rule (rules)
    → /maencof:lifecycle (hooks)
```

## Usage Examples

```
/maencof:configure
/maencof:configure --scan
/maencof:configure --fix
/maencof:configure --migrate
```

Natural language:
```
"Check my project settings"
"Something is broken, help me fix it"
"Set up my Claude Code environment"
```

## Error Handling

| Condition | Resolution |
|-----------|------------|
| maencof not initialized | Suggest `/maencof:setup` for full setup |
| JSON parse error | Identify file, create backup, offer manual merge guidance |
| Sub-skill routing failure | Provide direct instructions as fallback |
| Permission error | Show `.claude/settings.json` manual edit guide |
| @import path mismatch | Verify file existence, suggest path correction |

## Acceptance Criteria

- Full environment scan completed without errors
- All detected issues categorized by severity (error/warning/info)
- Correct routing to sub-skills for each intent
- Migration previewed as diff before applying
- No direct file modifications (all delegated to sub-skills)
