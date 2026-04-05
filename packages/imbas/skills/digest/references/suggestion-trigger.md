# digest — Suggestion Trigger Logic (Jira only)

> **Provider scope**: Suggestion auto-trigger is Jira-only in v1 because it
> depends on `transitionJiraIssue` events from `imbas:manifest`. Local mode
> has no equivalent transition signal — users invoke `imbas:digest` manually.
> See `local/workflow.md` Suggestion Trigger section.


## Trigger Conditions

The `imbas:digest` skill is suggested (not auto-executed) when all conditions are met:

1. **Done transition**: imbas:manifest calls `transitionJiraIssue` to move an issue to Done status
2. **Comment threshold**: the issue has >= 3 comments
3. **Author threshold**: comments are from >= 2 distinct authors

When triggered, display:
```
This ticket has discussion history (N comments from M authors).
Run /imbas:digest {issue-key} to compress the context?
```

This is a suggestion only — never auto-execute digest.

## Cross-Issue Synthesis

Not supported in current scope. Digest operates on a single issue only.
Cross-issue context synthesis may be added as a separate skill in the future.
