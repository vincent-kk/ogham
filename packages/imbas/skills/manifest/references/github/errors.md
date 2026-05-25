# Error Handling — GitHub Provider (manifest skill)

Provider-agnostic errors are in `../errors.md`. This file lists GitHub-specific
error cases triggered inside the manifest `workflow.md` (this directory).

## Error taxonomy

| Error ID | Trigger condition | Detection | Remediation |
|----------|------------------|-----------|-------------|
| `LABEL_BOOTSTRAP_FORBIDDEN` | `gh label create` exits non-zero with HTTP 403 or "resource not accessible" | Check exit code + stderr contains "403" or "resource not accessible" | Emit human-readable error (see below), call `mcp_tools_run_transition → blocked`, STOP. |
| `GH_CLI_MISSING` | `gh` binary not found in PATH | `which gh` exits non-zero | Abort; display: "gh CLI not found. Install from https://cli.github.com and retry." |
| `AUTH_MISSING` | `gh auth status` fails or any command returns "authentication required" | Stderr contains "authentication" or "auth" | Abort; display: "Run 'gh auth login' to authenticate, then retry." |
| `ISSUE_NOT_FOUND` | `gh issue view <N>` returns 404 or 410 | Exit code non-zero + stderr contains "404" or "Could not resolve" | WARN; offer to reset manifest item to pending for re-creation. |
| `RATE_LIMIT` | Any `gh` call returns 429 or "API rate limit exceeded" | Stderr contains "rate limit" | Abort; display retry-after hint from response headers. |
| `REPO_NOT_FOUND` | `gh issue create` returns "not found" for the repo | Stderr contains "not found" or "Could not resolve to a Repository" | Abort; verify `config.github.repo` is correct (`owner/name` format). |
| `BODY_PATCH_FAILED` | `gh api PATCH` returns 422 | Exit code non-zero + stderr | Log error on the item; skip link/task-list update; continue with next item. Report at end. |

## LABEL_BOOTSTRAP_FORBIDDEN — exact error message

When `gh label create` fails with 403:

```
gh label create failed: insufficient scopes. Run 'gh auth refresh -s repo' and retry.
```

After emitting this message:
1. Call `mcp_tools_run_transition` → `blocked` state.
2. Do NOT call `gh issue create`.
3. Do NOT create any issues in degraded (unlabeled) mode.

See `label-bootstrap.md` for full bootstrap protocol.

## Drift check errors

| Condition | Classification | Action |
|-----------|---------------|--------|
| Issue deleted (404/410 on drift check) | `DRIFT_DELETED` | WARN; offer reset to pending or skip |
| Issue closed unexpectedly | `DRIFT_STATE` | WARN; offer skip or proceed |
| `gh issue view` fails for other reason | NON-BLOCKING | Log "Could not verify `<ref>` — proceeding with manifest state." Continue. |

## Link write errors

If `gh api PATCH` fails while writing `## Links` or `## Sub-tasks`:
- Log the failure per item.
- Do NOT roll back the child issue that was already created.
- A future `imbas:repair-links` operation handles asymmetric link state.
- Continue with remaining items.
