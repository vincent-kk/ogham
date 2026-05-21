## Purpose

Claude Code plugin skill definitions for the cogair plugin. Each subdirectory
holds one user-invokable skill consumed by Claude Code at runtime via the
`.claude-plugin/plugin.json` manifest. No build step or TypeScript exports.

## Structure

| Path             | Role                                              |
| ---------------- | ------------------------------------------------- |
| `codex/SKILL.md` | `/codex` delegation skill (OpenAI Codex CLI)      |
| `gemini/SKILL.md`| `/gemini` delegation skill (Google Gemini CLI)    |
| `setup/SKILL.md` | `/setup` first-run configuration walkthrough      |

## Conventions

- SKILL.md frontmatter follows Claude Code skill schema.
- Skill names match directory names (no plugin prefix).
- Skills call MCP tools via `mcp_tools_<name>`; they never bypass the MCP layer.

## Boundaries

### Always do

- Keep skill bodies in English and reference MCP tools by their registered names.

### Ask first

- Add a new skill (requires plugin.json + MCP tool wiring updates).

### Never do

- Embed concrete model IDs in skill prose (dispatcher modelAlias owns those).
- Skip the MCP layer to invoke external CLIs directly from a skill body.

## Dependencies

- Runtime contract: `.claude-plugin/plugin.json`, `.mcp.json` (MCP server name `tools`).
