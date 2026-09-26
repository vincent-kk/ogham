# Tools Used — GitHub Provider

<!-- ogham-mcp-tools:imbas -->

## Bash Commands

| Command                                                  | Usage                        |
| -------------------------------------------------------- | ---------------------------- |
| `gh issue view <N> --repo <owner/repo> --json body,url`  | Fetch issue body and URL     |
| `gh issue view <N> --repo <owner/repo> --json title,url` | Fetch sub-task title and URL |

## imbas MCP Tools

| Tool                                  | Usage                                              |
| ------------------------------------- | -------------------------------------------------- |
| `mcp__plugin_imbas_tools__config_get` | Read `config.github.repo` for bare `#N` resolution |
