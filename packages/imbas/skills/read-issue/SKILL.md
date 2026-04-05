---
name: read-issue
user_invocable: false
description: "[imbas:read-issue] Internal skill. Reads a Jira issue with its full comment thread, reconstructs the conversation context, and returns a structured JSON summary."
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# read-issue — Issue Context Reconstruction (Internal)

Internal skill that reads a Jira issue with its full comment thread, reconstructs
the conversation context (who said what, decisions made, latest state), and returns
a structured JSON summary. Called by validate, split, devplan, digest skills and
by imbas-analyst, imbas-planner, imbas-engineer agents.

## Arguments

```
imbas:read-issue <issue-key> [--depth shallow|full]

<issue-key>  : Jira issue key (e.g., PROJ-123)
--depth      : shallow = metadata + description only, full = include comments (default: full)
```

## References

- [Workflow](./references/workflow.md) — Provider-agnostic skeleton (Step 0 routing, Step 5 structured output)
- [Output Schema](./references/output-schema.md) — JSON example and field reference table
- [Caching & Usage](./references/caching-and-usage.md) — Caching policy and agent usage patterns
- [Tools](./references/tools.md) — Shared tools (config_get) and provider delegation
- [Error Handling](./references/errors.md) — Provider-agnostic error conditions

<!-- imbas:constraints-v1 -->
## Workflow (Provider-agnostic skeleton)

1. Load inputs (target issue ID) via imbas_tools.
2. Read `config.provider` via `config_get`.
3. Load ONLY the provider-specific workflow file matching `config.provider`:

   | provider | workflow file |
   |---|---|
   | `jira`   | `references/jira/workflow.md` |
   | `github` | `references/github/workflow.md` |
   | `local`  | `references/local/workflow.md` |

4. Execute those steps exactly.
5. Return the shared structured output (per `output-schema.md`).

## Constraints

- When running as provider X, MUST NOT read any file under `references/Y/**` for any other Y.
- Provider-specific tools (atlassian__* for jira, `gh issue view` via Bash for github, Read/Glob for local) MUST only be invoked from within the matching `references/<provider>/` workflow.
