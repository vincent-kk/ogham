# MCP Config Scopes

Claude Code resolves MCP server configurations from three scope levels.
`.mcp.json` files live **alongside** `.claude/` directories, not inside them.

## Scope Hierarchy

| Scope | File location | Git-tracked | Visibility | Use case |
|-------|---------------|-------------|------------|----------|
| **User** | `~/.mcp.json` | No | All projects (personal) | Personal tools used across every project |
| **Project** | `<project-root>/.mcp.json` | Yes | Team-shared | Team-standard servers, committed to repo |
| **Local** | `<project-root>/.mcp.json.local` | No (gitignored) | Current project (personal) | Personal overrides, secrets, experiments |

## Directory Layout

```
~/                          # Home directory
├── .mcp.json               # User scope — applies to all projects
├── .claude/                # User-level Claude Code config
│   └── ...
└── projects/my-app/        # Project root
    ├── .mcp.json           # Project scope — team-shared, git-tracked
    ├── .mcp.json.local     # Local scope — personal override, gitignored
    ├── .claude/            # Project-level Claude Code config
    │   └── ...
    └── src/
```

Key insight: `.mcp.json` and `.claude/` are **sibling entries** at the same directory level.
They serve different purposes — `.mcp.json` for MCP servers, `.claude/` for Claude Code settings.

## Precedence (highest wins)

```
Local (.mcp.json.local)  >  Project (.mcp.json)  >  User (~/.mcp.json)
```

When the same server name appears in multiple scopes, the highest-precedence scope wins.
Servers from different scopes with different names are merged additively.

## File Format

All three files share the same schema:

```json
{
  "mcpServers": {
    "<server-name>": {
      "type": "http",
      "url": "https://example.com/mcp"
    }
  }
}
```

Environment variable expansion is supported in all string values:
- `${VAR}` — expand to env var value
- `${VAR:-default}` — expand with fallback

## CLI Commands

```bash
# Add to user scope (available in all projects)
claude mcp add --scope user <name> ...

# Add to project scope (team-shared, git-tracked)
claude mcp add --scope project <name> ...

# Add to local scope (personal override for this project)
claude mcp add --scope local <name> ...
```

## Scope Selection Guide for imbas-setup

When `register-atlassian-mcp` or similar auto-setup actions write to `.mcp.json`,
the target scope must be chosen based on context:

| Condition | Recommended scope | Rationale |
|-----------|-------------------|-----------|
| Team project, server needed by all devs | **Project** | `.mcp.json` committed to repo |
| Personal tool, used across projects | **User** | `~/.mcp.json` in home directory |
| Testing / experiment / secret URL | **Local** | `.mcp.json.local`, not committed |

### Decision flow for auto-setup

```
1. Ask user which scope to use:
   [1] project — .mcp.json (team-shared, git-tracked)
   [2] user    — ~/.mcp.json (all projects, personal)
   [3] local   — .mcp.json.local (this project only, gitignored)

2. Default recommendation: project (most common for team tooling).

3. Resolve target file path:
   - project → <cwd>/.mcp.json
   - user    → ~/.mcp.json
   - local   → <cwd>/.mcp.json.local
```

## Security Notes

- **Project scope**: No secrets — file is git-tracked. Use `${ENV_VAR}` for sensitive values.
- **User scope**: Not git-tracked but visible to all projects. Acceptable for personal API keys.
- **Local scope**: Not git-tracked, project-specific. Best for secrets and experiments.
- Project-scope servers require user approval on first use (Claude Code prompts automatically).
