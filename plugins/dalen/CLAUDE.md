# CLAUDE.md — @ogham/dalen

`@ogham/dalen` package work guide. Package contract: [INTENT.md](./INTENT.md); source structure: [src/INTENT.md](./src/INTENT.md). Full design spec: [`.metadata/dalen/`](../../.metadata/dalen/). Development plan: [HANDOFF.md](./HANDOFF.md).

## Status

Implemented: render core, the local HTTP server + report viewer, line-anchored feedback (long-poll), the settings UI, and the `present` / `setup` skills. Four MCP tools: `render_report`, `collect_feedback`, `close_report`, `open_settings`. Build artifacts (`bridge/`) are built and committed by the user.

## What dalen does

A local MCP server renders Claude-generated markdown reports as a readable browser page (127.0.0.1) and collects line-anchored feedback — including file and clipboard images — back to Claude via a bounded long-poll. Heavy renderers (Mermaid / highlight.js / KaTeX) are lazy-loaded browser assets.

## Commands

```bash
yarn dalen typecheck     # tsc --noEmit
yarn dalen test:run      # vitest run (single)
yarn dalen test          # vitest watch
yarn dalen build         # clean → version:sync → tsc (pipeline grows per phase)
yarn dalen version:sync  # package.json → src/version.ts + plugin.json
```

(Run from the repo root; the `dalen` alias maps to `yarn workspace @ogham/dalen`.)

## Plugin Runtime

- Skill names have no plugin prefix (`setup`, `present`) — directory name = skill name.
- MCP server name is `tools` — skills reference it as `mcp_tools_<name>`.
- **No agents, no hooks** (hence no `libs/run.cjs`).
- Heavy renderers live in `bridge/assets/` (built by `buildRenderers.mjs`) and are **never** bundled into `mcp-server.cjs` — enforced by a `buildMcpServer.mjs` guard.

## Development Notes

- **Version**: `yarn version:sync` only. Never hand-edit `src/version.ts` or `.claude-plugin/plugin.json`.
- **Build artifacts**: `bridge/` is built and committed by the user, not the AI. The AI authors `src/`, `scripts/`, `skills/`, and docs only.
- **Disk paths**: under `~/.claude/plugins/dalen/`.
- **FCA**: before coding a module, read `.metadata/dalen/`, update its `DETAIL.md`/`INTENT.md`, then run `/filid:scan` after. Domain roots (`core`/`render`/`mcp`/`mcp/httpServer`) carry `INTENT.md`; single-concern subdirs and `types`/`constants`/`lib`/`utils` are organs.

## References

`../../.metadata/dalen/`: README, spec, architecture, mcp-runtime, mcp-tools, rendering, feedback-protocol, web-ui, skills, storage, roadmap.
