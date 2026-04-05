# Error Handling — GitHub Provider (devplan skill)

Provider-agnostic errors are in `../errors.md`. This file lists GitHub-specific
error cases for the devplan skill's GitHub branch.

## Error taxonomy

| Error ID | Trigger condition | Detection | Remediation |
|----------|------------------|-----------|-------------|
| `GH_CLI_MISSING` | `gh` binary not found during optional Step 2 reads | `which gh` fails | Log warning; skip optional GitHub reads; continue with code-only exploration. |
| `AUTH_MISSING` | `gh` commands return "authentication required" during optional reads | Stderr contains "authentication" | Log warning; skip optional GitHub reads; warn user to run `gh auth login`. |
| `ISSUE_NOT_FOUND` | `gh issue view` returns 404 for a referenced Story during optional reads | Exit non-zero + stderr "404" | Log warning; treat the issue as unreadable; continue exploration with available data. |
| `RATE_LIMIT` | `gh` returns "rate limit exceeded" during optional reads | Stderr contains "rate limit" | Skip remaining optional reads; continue with code-only exploration. |

## Optional reads are non-blocking

All GitHub tool calls in devplan Step 2 are **optional**. Failures do NOT
abort the devplan skill. The skill degrades gracefully to code-only exploration
(ast_search, ast_analyze, Read, Grep, Glob) when GitHub access is unavailable.

## Manifest output errors

The devplan skill emits `feedback_comments` with `target_ref: "owner/repo#N"`.
If a `target_ref` cannot be resolved (story has no `issue_ref` in the manifest),
the feedback_comment is still recorded with a null `target_ref` and a warning:

```
Warning: Story "<ID>" has no issue_ref. Feedback comment recorded but cannot be
posted until the story is created in GitHub. Run /imbas:imbas-manifest to create it first.
```

This is a planning-time warning, not a runtime execution error. The manifest
skill handles the actual posting.
