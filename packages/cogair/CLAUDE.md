# CLAUDE.md — @ogham/cogair

Guidance for Claude Code when working in this package.

## What is cogair?

`@ogham/cogair` is a Claude Code plugin that lets Claude delegate work to **OpenAI Codex CLI** or **Google Gemini CLI**. It exposes:

- 3 MCP tools — `start_conversation`, `continue_conversation`, `open_settings`.
- 4 user-invocable skills — `/setup`, `/codex`, `/gemini`, `/crosscheck`.
- 2 lifecycle hooks — `SessionStart`, `UserPromptSubmit`.
- No agents. Delegation is the user's call, mediated by skills + hooks.

Single-layer architecture — there is no agent layer between skills and the MCP server. Skills are thin tool-call mappers; the MCP server holds all logic; hooks inject lightweight policy + counter state.

## Commands

```bash
yarn build              # clean → version:sync → settingsHtml → tsc → mcpServer → hooks
yarn build:plugin       # MCP + hook bundles only (skip tsc and version:sync)
yarn typecheck          # Type-check (no emit)
yarn test               # Vitest watch
yarn test:run           # Single run (CI)
yarn test:coverage      # Coverage
yarn format && yarn lint
yarn version:sync       # package.json → src/version.ts
```

## Architecture

```
Skills (/setup, /codex, /gemini, /crosscheck)    Layer 3 (user) — thin tool-call mappers
        │
        ▼
MCP "tools" server                       Layer 2 (logic) — 3 MCP tools
        │
        ▼
Dispatcher (codex / gemini)              spawn external CLI, parse output, build envelope
        │
        ▼
Core storage                             ~/.claude/plugins/cogair/{config,counter,sessions}
        │
        ▲
Hooks (SessionStart, UserPromptSubmit)   Layer 1 (auto) — read-only context injection
```

Dependency direction is unidirectional. Hooks are isolated thin scripts (Node builtins only) and never import `src/core/` or `src/types/` — zod or the MCP SDK in a hook bundle would blow the 10 KB LIGHT cap.

## Key Source Directories

| Path              | Role                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `src/types/`      | Zod schemas + TypeScript types (the only zod consumers)           |
| `src/constants/`  | Paths, defaults, error codes                                      |
| `src/lib/`        | atomic write, logger                                              |
| `src/utils/`      | parent-pid, isoNow                                                |
| `src/core/`       | config / counter / session / project-hash / auth-token managers   |
| `src/dispatcher/` | codex-cli / gemini-cli spawn, JSONL parser, model alias, envelope |
| `src/mcp/`        | MCP server + 3 tool handlers + settings web UI                    |
| `src/hooks/`      | injectStatic, injectDynamic, shared organ (esbuild entry points)  |

## Key Files

- `src/mcp/server/lifecycle/createServer.ts` — registers the 3 MCP tools
- `src/mcp/tools/openSettings/` — local settings web UI (one-time-token auth, 5-minute idle shutdown)
- `src/dispatcher/codex/modelAlias.ts`, `src/dispatcher/gemini/modelAlias.ts` — single source of truth for tier → concrete model ID mapping
- `src/hooks/shared/loadConfig.ts` — hook-scoped config loader (no zod; migrates legacy schemas read-only)
- `src/hooks/injectStatic/injectStatic.ts` — SessionStart payload builder
- `src/hooks/injectDynamic/injectDynamic.ts` — UserPromptSubmit payload builder
- `scripts/buildMcpServer.mjs`, `scripts/buildHooks.mjs` — esbuild bundlers (filid pattern)
- `hooks/hooks.json` — Claude Code event mapping
- `.claude-plugin/plugin.json` — plugin manifest
- `.mcp.json` — MCP server registration (server name: `tools`)

## Plugin Runtime

- Skill names use **no plugin prefix** (`setup`, `codex`, `gemini`, `crosscheck`) — directory names match skill names.
- MCP server name is `tools`, so tools are referenced as `mcp_tools_<name>` from skills and other consumers.
- Hook bundle cap: **10 KB LIGHT tier** (enforced by `scripts/buildHooks.mjs`). Both injectStatic and injectDynamic currently land near 3.3 KB minified.
- Forbidden in hook bundles: zod, MCP SDK, fast-glob, lodash, moment, date-fns — enforced by `FORBIDDEN_PATTERNS` in `scripts/buildHooks.mjs`.

## Development Notes

- **Version**: edit only via `yarn version:sync`. `src/version.ts` and `.claude-plugin/plugin.json` mirror `package.json`.
- **Tests**: `src/**/__tests__/**/*.test.ts`. Use temp dirs via `vitest.setup.ts` for any test that touches `~/.claude/plugins/cogair/`.
- **Mock CLIs**: dispatcher integration tests use scripted CLIs on a fake `PATH` to cover success / auth-fail / rate-limit / network-fail / cli-missing / ignored-options.
- **Sessions**: project-hash-scoped (`sha256(cwd).slice(0, 12)`). `continue_conversation` returns `error.code: 'unknown'` when the session belongs to a different cwd — there is no automatic cross-project fallback.
- **Gemini sandbox**: `GEMINI_CLI_TRUST_WORKSPACE=true` is always injected into gemini spawns (non-interactive agent mode); it is not toggleable via `/setup`. Workspace-restricted gemini execution is not currently supported.
- **Model IDs**: hard-coded model strings belong **only** in `src/dispatcher/<provider>/modelAlias.ts`. Skills, README, CLAUDE.md, INTENT.md, and DETAIL.md describe **tiers** (`high`/`mid`/`low`/`auto`), never concrete model strings — upstream CLI renames must not ripple beyond one file.

## References

`../../.metadata/cogair/`:
[spec.md](../../.metadata/cogair/spec.md),
[architecture.md](../../.metadata/cogair/architecture.md),
[mcp-tools.md](../../.metadata/cogair/mcp-tools.md),
[skills.md](../../.metadata/cogair/skills.md),
[hooks.md](../../.metadata/cogair/hooks.md),
[storage.md](../../.metadata/cogair/storage.md),
[web-ui.md](../../.metadata/cogair/web-ui.md),
[provider-dispatch.md](../../.metadata/cogair/provider-dispatch.md),
[roadmap.md](../../.metadata/cogair/roadmap.md).
