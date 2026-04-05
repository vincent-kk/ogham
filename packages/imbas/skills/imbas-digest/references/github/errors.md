# Error Handling — GitHub Provider (digest skill)

Provider-agnostic errors are in `../errors.md`. This file lists GitHub-specific
error cases triggered inside the digest `workflow.md` (this directory).

## Error taxonomy

| Error ID | Trigger condition | Detection | Remediation |
|----------|------------------|-----------|-------------|
| `ISSUE_NOT_FOUND` | `gh issue view` returns 404 or "Could not resolve" (delegated via read-issue) | Exit non-zero + stderr | Abort; report "Issue `<ref>` not found." |
| `AUTH_MISSING` | Any `gh` call returns "authentication required" | Stderr contains "authentication" | Abort; display "Run 'gh auth login' and retry." |
| `GH_CLI_MISSING` | `gh` binary not found | `which gh` fails | Abort; display install link. |
| `RATE_LIMIT` | `gh` returns "rate limit exceeded" | Stderr contains "rate limit" | Abort with retry-after hint. |
| `COMMENT_POST_FAILED` | `gh issue comment` exits non-zero (non-auth reason) | Exit code + stderr | Abort; display raw error from stderr. Do NOT silently drop the digest. |
| `EDIT_LAST_NO_COMMENT` | `gh issue comment --edit-last` fails with "no comments" | Stderr contains "no comments" | Fall back to posting a new comment. Log: "No prior comment to edit — posting as new." |

## Last-wins collision — not an error

Multiple `<!-- imbas:digest -->`-marked comments on one issue is an expected
state (multiple digest runs without `--update`). This is NOT an error.
Apply the last-wins policy (most recent `createdAt` is canonical) as
documented in `workflow.md` and `SPEC-provider-github.md §1.8`.

## Preview mode

When `--preview` is set, no `gh` comment commands are run. No GitHub-specific
errors can occur. All errors in preview mode are read-side errors from the
delegated `imbas-read-issue` call.

## Partial read errors

If the delegated `imbas-read-issue` call returns a partial result (e.g., body parsed
but comments truncated due to pagination), the digest skill MUST surface the
warning to the user before proceeding:
```
Warning: comment list may be truncated. Digest may not cover all comments.
Proceed? [y/N]
```
Do not silently produce a digest from incomplete data.
