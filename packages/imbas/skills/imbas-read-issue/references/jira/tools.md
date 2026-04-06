# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`.

## Jira Operations

| Operation | Usage |
|-----------|-------|
| `[OP: get_issue]` | Query issue metadata, description, and comments |

The LLM resolves which tool to use at runtime based on the session's available tools.

## Agent Spawn

No agent spawn. This skill executes directly and returns structured data.
