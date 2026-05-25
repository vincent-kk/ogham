# Error Handling — GitHub Provider (read-issue skill)

Provider-agnostic errors are in `../errors.md`. This file lists GitHub-specific
error cases triggered inside the read-issue `workflow.md` (this directory).

## Error taxonomy

| Error ID | Trigger condition | Detection | Remediation |
|----------|------------------|-----------|-------------|
| `ISSUE_NOT_FOUND` | `gh issue view` returns 404 or 410, or "Could not resolve" | Exit code non-zero + stderr | Abort; report "Issue `<ref>` not found. Verify the issue number and repo." |
| `AUTH_MISSING` | Any `gh` call returns "authentication required" | Stderr contains "authentication" or "Credentials" | Abort; display "Run 'gh auth login' and retry." |
| `GH_CLI_MISSING` | `gh` binary not found | `which gh` fails | Abort; display "gh CLI not found. Install from https://cli.github.com and retry." |
| `RATE_LIMIT` | `gh` returns 429 or "API rate limit exceeded" | Stderr contains "rate limit" | Abort with retry-after hint from response headers. |

## Last-wins digest collision

When multiple `<!-- imbas:digest -->`-marked comments exist on the same issue,
this is NOT an error. Apply the **last-wins policy**:
- Sort marked comments by `createdAt` descending.
- Use the most recent as canonical.
- Earlier marked comments are superseded — do not parse them.
- Log a debug note: "Multiple digest comments found; using most recent (createdAt: <ts>)."

This policy is defined in `SPEC-provider-github.md §1.8` and the plan Phase 2.4.

## Body parse warnings

Malformed `## Links` section (e.g., unknown `linkType`, bad ref format):
- Severity: WARNING (not error).
- Action: log the parse warning, treat the section as `{}` for that key, continue.
- Forward-compat: unknown `linkType` values are logged and ignored.

Malformed `## Sub-tasks` task-list (e.g., unexpected line format):
- Action: skip the malformed line, log a warning, continue parsing remaining lines.

## Shallow depth

When `depth == "shallow"` is requested and the issue is found, no errors
are generated for missing comments or an absent digest. Shallow mode
explicitly skips comment processing — this is expected behavior, not an error.
