# CLAUDE.md - @ogham/atlassian

This file provides guidance to Claude Code when working with code in this repository.

## What is atlassian?

`@ogham/atlassian` is a Claude Code plugin that replaces the Python `mcp-atlassian` MCP server with a native TypeScript plugin. It provides 3 MCP tools (fetch, convert, setup), 4 domain skills, and 2 domain-expert agents for Jira and Confluence integration.

## Architecture

```
Dispatcher (Claude Code main agent)
    ├── Agent: jira        (Jira domain expert)
    ├── Agent: confluence   (Confluence domain expert)
    ├── Skill: atlassian-setup      (auth/connection setup)
    ├── Skill: atlassian-download   (attachment download)
    ├── Skill: atlassian-jira       (Jira API domain router, 15 tool domains)
    ├── Skill: atlassian-confluence (Confluence API domain router, 8 tool domains)
    └── MCP Server "tools"
            ├── fetch     (HTTP GET/POST/PUT/PATCH/DELETE)
            ├── convert   (ADF/Storage ↔ Markdown)
            └── setup     (auth setup wizard)
```

### Dependency Direction

```
Dispatcher → Agent → Skill → MCP → Atlassian REST API
```

Unidirectional only. Lower layers are unaware of upper layers.

## Commands

```bash
yarn build          # clean → version:sync → tsc → esbuild
yarn typecheck      # type check (no emit)
yarn test:run       # single run (CI)
yarn test           # watch mode
yarn format && yarn lint  # format + lint
```

## Key Directories

| Path | Role |
|------|------|
| `src/types/` | Zod schemas and type definitions |
| `src/constants/` | Paths, defaults, config constants |
| `src/core/` | Config, auth, environment, HTTP client |
| `src/converter/` | ADF/Storage ↔ Markdown (ported from Python) |
| `src/mcp/` | MCP server and 3 tool handlers |
| `src/lib/` | Logger, file I/O |
| `src/utils/` | URL helpers |
| `agents/` | 2 domain-expert agents (jira, confluence) |
| `skills/` | 4 skills with lazy reference loading |

## Skills (4)

`atlassian-setup`, `atlassian-download`, `atlassian-jira`, `atlassian-confluence`

## Agents (2)

`jira` (sonnet), `confluence` (sonnet)

## Development Notes

- **Version**: `src/version.ts` — auto-generated, do not edit. Use `yarn version:sync`.
- **Tests**: `src/**/__tests__/**/*.test.ts`
- **Security**: SSRF guard in `core/http-client/ssrf-guard.ts`. Credentials stored as plain JSON in `~/.claude/plugins/atlassian/credentials.json`.
- **Converter**: Ported from Python `mcp-atlassian`. ADF ↔ Markdown and Storage ↔ Markdown.
