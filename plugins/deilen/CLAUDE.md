# CLAUDE.md — @ogham/deilen

`@ogham/deilen` package work guide. Package contract: [INTENT.md](./INTENT.md); source structure: [src/INTENT.md](./src/INTENT.md). Full design spec: [`.metadata/deilen/`](../../.metadata/deilen/). Development plan: [HANDOFF.md](./HANDOFF.md).

## Status

Implemented: render core, the local HTTP server + viewer, line-anchored feedback (long-poll), the settings UI, and the `present` / `setup` skills. Four MCP tools: `render_viewer`, `collect_feedback`, `close_viewer`, `open_settings`. Build artifacts (`bridge/`) are built and committed by the user.

## What deilen does

A local MCP server renders Claude-generated markdown documents as a readable browser page (127.0.0.1) and collects line-anchored feedback — including file and clipboard images — back to Claude via a bounded long-poll. Heavy renderers (Mermaid / highlight.js / KaTeX) are lazy-loaded browser assets.

## Commands

```bash
yarn deilen typecheck     # tsc --noEmit
yarn deilen test:run      # vitest run (single)
yarn deilen test          # vitest watch
yarn deilen build         # clean → version:sync → tsc (pipeline grows per phase)
yarn deilen version:sync  # package.json → src/version.ts + plugin.json
```

(Run from the repo root; the `deilen` alias maps to `yarn workspace @ogham/deilen`.)

## Plugin Runtime

- Skill names have no plugin prefix (`setup`, `present`) — directory name = skill name.
- MCP server name is `tools` — skills reference it as `mcp_tools_<name>`.
- **No agents, no hooks** (hence no `libs/run.cjs`).
- Heavy renderers live in `bridge/assets/` (built by `buildRenderers.mjs`) and are **never** bundled into `mcp-server.cjs` — enforced by a `buildMcpServer.mjs` guard.

## Development Notes

- **Version**: `yarn version:sync` only. Never hand-edit `src/version.ts` or `.claude-plugin/plugin.json`.
- **Build artifacts**: `bridge/` is built and committed by the user, not the AI. The AI authors `src/`, `scripts/`, `skills/`, and docs only.
- **Disk paths**: under `~/.claude/plugins/deilen/`.
- **FCA**: before coding a module, read `.metadata/deilen/`, update its `DETAIL.md`/`INTENT.md`, then run `/filid:scan` after. Domain roots (`core`/`render`/`mcp`/`mcp/httpServer`) carry `INTENT.md`; single-concern subdirs and `types`/`constants`/`lib`/`utils` are organs.

## References

`../../.metadata/deilen/`: README, spec, architecture, mcp-runtime, mcp-tools, rendering, feedback-protocol, web-ui, skills, storage, roadmap.
