# Error Handling

Failures from `scaffold-pr.mjs` arrive as one JSON line: `{ok: false, code, message, dirtyFiles?}`. Conditions before the script runs (issue lookup, provider gate) are detected by the skill itself.

## Error Conditions

| Condition                 | Detection                                     | Action                                                                                             |
| ------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Issue not found           | `read-issue` returns error or empty result    | STOP with message: "Issue `<ref>` not found. Verify the issue key/URL and provider configuration." |
| Local provider            | `config.provider === "local"`                 | STOP per Step 0 gate (terminal BLOCKED marker).                                                    |
| git not installed         | code `GIT_MISSING`                            | STOP with the script message.                                                                      |
| Not a git repository      | code `NOT_A_REPO`                             | STOP with message: "Current directory is not a git repository."                                    |
| gh CLI not available      | code `GH_MISSING`                             | STOP with message: "GitHub CLI (gh) is required. Install: https://cli.github.com/"                 |
| gh not authenticated      | code `GH_UNAUTHENTICATED`                     | STOP with the script message (includes the gh hint).                                               |
| Dirty working tree        | code `DIRTY_TREE` (payload `dirtyFiles`)      | ASK USER whether to continue; yes → rerun with `--allow-dirty`. Never stash or commit.             |
| Branch already exists     | code `BRANCH_EXISTS`                          | ASK USER whether to use existing branch; yes → rerun with `--reuse-branch`. No → STOP.             |
| PR already exists         | success with `existing: true`                 | Output existing PR URL and STOP. Not an error; no duplicate is created.                            |
| Base branch not found     | code `SWITCH_FAILED` or `BASE_RESOLVE_FAILED` | STOP with the script message.                                                                      |
| Push rejected             | code `PUSH_FAILED`                            | STOP with the script message. Common cause: no remote configured or permission denied.             |
| PR creation/lookup failed | code `PR_CREATE_FAILED` / `PR_LOOKUP_FAILED`  | STOP with the script message.                                                                      |

## Recovery

All operations before PR creation are local and reversible:

- Branch can be deleted: `git branch -D <branch-name>`
- Empty commit can be reset: `git reset HEAD~1`

If PR creation fails after push, the branch exists on remote but no PR was created. Rerun the skill: the script takes `--reuse-branch` for the existing branch and detects an existing PR instead of duplicating it.
