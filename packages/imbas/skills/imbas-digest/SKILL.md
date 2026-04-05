---
name: imbas-digest
user_invocable: true
description: "[imbas:imbas-digest] Compresses a Jira issue's full context (description + comment thread + media) into a structured summary and posts it as a Jira comment. Uses State Tracking + QA-Prompting hybrid approach. Trigger: \"digest issue\", \"이슈 정리\", \"이슈 요약\", \"티켓 정리\", \"티켓 요약\", \"imbas digest\""
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# imbas-digest — Issue Context Compression

Compresses a Jira issue's full context (description, comment thread, and attached media)
into a structured summary and posts it as a Jira comment. Designed for ticket closing
or pre-analysis compression. Uses a State Tracking + QA-Prompting hybrid approach.

## When to Use This Skill

- Before closing a ticket with extensive discussion history
- When onboarding someone to a long-running issue
- When imbas:manifest transitions an issue to Done (suggestion trigger)
- Pre-processing an issue before imbas:validate or imbas:split references it

## Arguments

```
/imbas:imbas-digest <issue-key> [--preview]

<issue-key>  : Jira issue key (e.g., PROJ-123)
--preview    : Show digest without posting to Jira (dry run)
```

## References

- [workflow.md](./references/workflow.md) — Provider-agnostic skeleton (Steps 0–5); Step 6 publish is provider-specific
- [digest-marker.md](./references/digest-marker.md) — (Jira only) Digest Marker Specification for posted comments
- [suggestion-trigger.md](./references/suggestion-trigger.md) — (Jira only) Suggestion Trigger Logic
- [tools.md](./references/tools.md) — Shared tools (config_get) and delegated skills
- [errors.md](./references/errors.md) — Provider-agnostic error handling

<!-- imbas:constraints-v1 -->
## Workflow (Provider-agnostic skeleton)

1. Load inputs (issue reference) via imbas_tools.
2. Read `config.provider` via `config_get`.
3. Load ONLY the provider-specific workflow file matching `config.provider`:

   | provider | workflow file |
   |---|---|
   | `jira`   | `references/jira/workflow.md` |
   | `github` | `references/github/workflow.md` |
   | `local`  | `references/local/workflow.md` |

4. Execute Steps 0–5 from the shared skeleton, then the provider's Step 6 publish.
5. Persist outputs via the provider's publish path (Jira comment or local `## Digest` append).

## Constraints

- When running as provider X, MUST NOT read any file under `references/Y/**` for any other Y.
- Provider-specific tools (atlassian__* for jira, `gh issue comment` / `gh api` via Bash for github, Read/Write/Edit for local) MUST only be invoked from within the matching `references/<provider>/` workflow.
