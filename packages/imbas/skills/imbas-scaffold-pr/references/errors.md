# Error Handling

## Error Conditions

| Condition | Detection | Action |
|-----------|-----------|--------|
| Issue not found | `imbas-read-issue` returns error or empty result | STOP with message: "Issue `<ref>` not found. Verify the issue key/URL and provider configuration." |
| Local provider | `config.provider === "local"` | STOP with message: "scaffold-pr requires a remote git host (Jira or GitHub). Local provider is not supported." |
| Branch already exists | `git rev-parse --verify` succeeds | ASK USER whether to use existing branch or stop. |
| PR already exists | `gh pr list --head` returns a URL | Output existing PR URL and STOP. Do not create duplicate. |
| Push rejected | `git push` fails | STOP with git error output. Common cause: no remote configured or permission denied. |
| gh CLI not available | `gh pr create` command not found | STOP with message: "GitHub CLI (gh) is required. Install: https://cli.github.com/" |
| Not a git repository | `git rev-parse` fails | STOP with message: "Current directory is not a git repository." |
| Base branch not found | `git checkout <base>` fails | STOP with message: "Base branch `<base>` not found." |

## Recovery

All operations before PR creation are local and reversible:
- Branch can be deleted: `git branch -D <branch-name>`
- Empty commit can be reset: `git reset HEAD~1`

If PR creation fails after push, the branch exists on remote but no PR was created.
User can retry PR creation manually or re-run the skill.
