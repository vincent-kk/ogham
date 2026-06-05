# CLAUDE.md — @ogham/prawf

Working guide for the `@ogham/prawf` package. See [INTENT.md](./INTENT.md) for the package contract and [src/INTENT.md](./src/INTENT.md) for the source layout.

> **Status: skeleton.** The plugin ships the full cogair-style runtime structure (esbuild → committed `bridge/`), but the MCP server is a 0-tool stub and `skills/` / `agents/` are empty (`.gitkeep`). Fill them by mirroring the cogair / imbas packages.

## Commands

```bash
yarn build              # clean → version:sync → tsc → mcpServer → hooks
yarn build:plugin       # MCP + hook bundles only (skip tsc / version:sync)
yarn typecheck          # type check (no emit)
yarn test:run           # single test run (CI)
yarn format             # prettier
yarn version:sync       # package.json → src/version.ts + plugin.json
```

## Architecture

```
MCP "tools" server (stdio)   → bridge/mcp-server.cjs    — src/mcp/, 0-tool stub
Hook (SessionStart)          → bridge/injectStatic.mjs  — src/hooks/, static banner
```

Build artifacts land in `bridge/` and are committed (`package.json:files`). `dist/` is library-export only and is not emitted (base tsconfig `noEmit`); plugins ship via `bridge/`.

## Plugin Runtime

- **MCP server** name is `tools` (`.mcp.json`). Register tools in `src/mcp/server/lifecycle/createServer.ts`; tool schemas use `zod`. esbuild entry is `src/mcp/serverEntry/serverEntry.ts`.
- **Hooks** stay thin (`node:*` builtins only). A 10 KB LIGHT cap + `FORBIDDEN_PATTERNS` in `scripts/buildHooks.mjs` block `zod` / MCP SDK / glob / lodash from hook bundles. Each hook command runs through `libs/run.cjs` (cross-platform Node runner).
- **Skills** — drop `skills/<name>/SKILL.md` (English). The `"skills": "./skills/"` field is already wired in `plugin.json`.
- **Agents** — drop `agents/<name>.md` (English). Auto-discovered; do NOT add an `agents` field to `plugin.json`.

## Development Notes

- **Version**: use `yarn version:sync` only. `src/version.ts` and `.claude-plugin/plugin.json` mirror `package.json`.
- **Hook sync**: editing `hooks/hooks.json` requires updating `hookEntries` in `scripts/buildHooks.mjs` and adding `src/hooks/<name>/build/<name>.entry.ts`.
- **Tests**: `src/**/__tests__/**/*.test.ts`. FCA 3+12 rule — max 15 cases per spec file.
- **Registration**: listed in root `.claude-plugin/marketplace.json` and `scripts/typecheck-all.mjs` (CONSUMERS).
