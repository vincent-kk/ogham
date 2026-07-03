# CLAUDE.md — @ogham/r-statistics

`@ogham/r-statistics` package work guide. Package contract: [INTENT.md](./INTENT.md); source structure: [src/INTENT.md](./src/INTENT.md). Full design spec: [`.metadata/r-statistics/`](../../.metadata/r-statistics/).

## What r-statistics does

Turns Claude into a domain-agnostic statistics expert. A deterministic dispatcher (the `analyze` skill) wraps three reasoning agents (statistician / r-expert / methodology-validator) and a deterministic MCP execution layer. The MCP server (`tools`) runs LLM-generated R in an isolated workspace via headless `Rscript`, collects artifacts, and enforces a deterministic statistical hard gate. The only domain is statistics — never anchor to an application field.

## Commands

```bash
yarn rStatistics typecheck     # tsc --noEmit
yarn rStatistics test:run      # vitest run (single)
yarn rStatistics test          # vitest watch
yarn rStatistics build         # clean → version:sync → tsc → buildMcpServer
yarn rStatistics version:sync  # package.json → src/version.ts + plugin.json
```

(Run from the repo root; the `rStatistics` script maps to `yarn workspace @ogham/r-statistics`.)

## Architecture (3-layer)

- **Dispatcher** — `skills/analyze/` state machine (intent → transitions → gate → mode).
- **Agents** — `agents/{statistician,r-expert,methodology-validator}.md` (recommend only).
- **Skills** — 6 exposed (analyze, data-preparation, assumption-check, visualization, reporting, r-setup) + lazy `skills/analyze/references/methods/{technique}/`.
- **MCP** — `tools` server, 4 tools: `run_r`, `get_r_job`, `cancel_r_job`, `assert_analysis_plan`.
- **R-CLI** — headless `Rscript --vanilla` in a temp workspace with the `shared/contract.R` execution contract.

## Plugin Runtime

- Skill names have no plugin prefix (directory name = skill name).
- MCP server name is `tools`; registered tool names are kebab-case — skills/agents reference them as `mcp__plugin_r-statistics_tools__<name>` (e.g. `mcp__plugin_r-statistics_tools__run_r`).
- Agents auto-discover from `agents/` — **do not** add an `agents` field to `plugin.json` (matches filid).
- **No hooks.**

## Development Notes

- **Version**: `yarn version:sync` only. Never hand-edit `src/version.ts` or `.claude-plugin/plugin.json`.
- **Build artifacts**: `bridge/mcp-server.cjs` is the runtime; `dist/` is library export. Heavy/statistics deps never enter the bundle (size guard in `buildMcpServer.mjs`).
- **Disk paths**: under `~/.claude/plugins/r-statistics/`.
- **The assert ruleset** (`src/mcp/tools/assertAnalysisPlan/operations/ruleset.ts`) is the deterministic runtime authority; keep it in sync with the `methods/{technique}/meta.yaml` catalog.
- **R packages**: `r-setup` always installs `REQUIRED_PACKAGES` and offers the rest by use case via `PACKAGE_USE_CASES` (`src/constants/defaults.ts`); `PACKAGE_WHITELIST` is the run_r baseline. Keep the required/use-case lists in `skills/r-setup/references/packages.md` in sync with those constants.
- **FCA**: domain roots (`core`, `core/*`, `mcp`, `mcp/server`, `mcp/shared`, `mcp/tools`, each tool) carry `INTENT.md`; `types`/`constants`/`lib`/`utils`/`operations` are organs.

## References

`../../.metadata/r-statistics/`: README, architecture, mcp-tools, assert-rules, dispatcher, skills, agents, spec, roadmap.
