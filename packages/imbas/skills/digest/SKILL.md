---
name: digest
user_invocable: true
description: >
  Compresses a Jira issue's full context (description + comment thread + media) into a structured summary and posts it as a Jira comment. Uses State Tracking + QA-Prompting hybrid approach.
  Trigger: "digest issue", "이슈 정리", "이슈 요약", "티켓 정리", "티켓 요약", "imbas digest"
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# digest — Issue Context Compression

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
/imbas:digest <issue-key> [--preview]

<issue-key>  : Jira issue key (e.g., PROJ-123)
--preview    : Show digest without posting to Jira (dry run)
```

## References

- [workflow.md](./references/workflow.md) — Complete Workflow (Steps 1-6): issue reading, state tracking, QA-prompting, 3-layer compression, comment formatting, preview/publish flow
- [digest-marker.md](./references/digest-marker.md) — Digest Marker Specification: marker format, field descriptions, re-run behavior
- [suggestion-trigger.md](./references/suggestion-trigger.md) — Suggestion Trigger Logic: trigger conditions, display format, cross-issue synthesis scope
- [tools.md](./references/tools.md) — Tools Used & Agent Spawn: Atlassian MCP tools, internal skill dependencies
- [errors.md](./references/errors.md) — Error Handling: error cases and recovery actions
