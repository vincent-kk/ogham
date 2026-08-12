# Tools Used — Provider-agnostic

Provider-specific tools are in `jira/tools.md` and `github/tools.md`.

## imbas MCP Tools (all providers)

| Tool                                  | Usage                                           |
| ------------------------------------- | ----------------------------------------------- |
| `mcp__plugin_imbas_tools__config_get` | Read `config.provider` to route Step 0 dispatch |

## Skill Invocations

| Skill               | Usage                                            |
| ------------------- | ------------------------------------------------ |
| `/imbas:read-issue` | Step 1: read issue metadata (key, summary, type) |

## Script Execution (all providers)

| Command                                                                                     | Usage                                                       |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `node .../scaffold-pr.mjs --check`                                                          | Optional preflight: repo root, resolved base, dirty files   |
| `node .../scaffold-pr.mjs --branch ... --title-file ... --message-file ... --body-file ...` | Branch + empty commit + push + Draft PR; one JSON line back |

Individual `git`/`gh` calls (branch creation, empty commit, push, `pr list`, `pr create`) are internal to `scaffold-pr.mjs` — this skill never issues them directly.

## Agent Spawn

No agent spawn. This skill executes directly.
