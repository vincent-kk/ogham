# digest — Suggestion Trigger Logic

## Trigger Conditions

The digest skill is suggested (not auto-executed) when all conditions are met:

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
