## Purpose

`@ogham/prawf` — a Claude Code plugin for **multi-agent academic peer review**
(_prawf_ is Welsh for "test/proof"). Six soundness reviewers attack a paper, an
author's advocate defends, and a handling editor adjudicates a verdict
(Accept / Minor / Major / Reject) plus an anticipated-question sheet. Pure
markdown — no MCP server, no hooks, no build, zero runtime dependencies.

## Structure

| Path                         | Role                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| `agents/`                    | 10 persona definitions (6 soundness + impact + rebuttal + chair + adjudicator) |
| `skills/review/`             | main 9-persona team evaluation + ported specs + profiles   |
| `skills/simulate-defense/`   | defense Q&A simulation skill                                |
| `skills/rebuttal/`           | external-review rebuttal-letter skill                      |
| `.claude-plugin/plugin.json` | plugin manifest (skills only; no `mcpServers`)             |
| `package.json`               | metadata + `version:sync` (no build)                       |

## Conventions

- Pure-markdown plugin — capabilities ship as `skills/` + `agents/`, never `bridge/`.
- Personas run as native Claude Code teams (`TeamCreate`/`Task`); external search
  is delegated as a capability, never bound to a named tool.
- English implementation; the Korean design SSoT lives in `.metadata/prawf/`.
- `version:sync` mirrors `package.json` version into `plugin.json` only.

## Boundaries

### Always do

- Keep `agents/*.md` and `skills/**/SKILL.md` in English.
- Keep persona ids and deliverable filenames consistent across every spec.

### Ask first

- Adding any MCP server, hook, or build step (breaks the pure-markdown contract).
- Adding or removing a persona (touches agents + orchestration + prompt-templates).

### Never do

- Add an `agents` field to `plugin.json` (agents are auto-discovered).
- Hardcode a specific external search tool into a persona.
- Let `impact-assessor` (significance) raise a verdict above Minor Revision.

## Dependencies

- **Runtime**: none (pure markdown).
- **Tooling**: root `scripts/inject-version.mjs` for `version:sync`.
- **Design SSoT**: `.metadata/prawf/` (Korean, read-only reference).
