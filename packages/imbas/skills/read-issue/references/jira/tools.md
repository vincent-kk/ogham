# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`.

## Jira Operations

| Operation | Usage |
|-----------|-------|
| [`[OP: get_issue]`](../../../_shared/operations/get_issue.md) | Query issue metadata, description, and comments |

The LLM resolves which tool to use at runtime. Read the linked operation file for REST fallback details.

## Agent Spawn

No agent spawn. This skill executes directly and returns structured data.
