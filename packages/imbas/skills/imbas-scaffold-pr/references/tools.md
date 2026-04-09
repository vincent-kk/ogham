# Tools Used — Provider-agnostic

Provider-specific tools are in `jira/tools.md` and `github/tools.md`.

## imbas MCP Tools (all providers)

| Tool | Usage |
|------|-------|
| `config_get` | Read `config.provider` to route Step 0 dispatch |

## Skill Invocations

| Skill | Usage |
|-------|-------|
| `/imbas:imbas-read-issue` | Step 0: read issue metadata (key, summary, type) |

## Bash Commands (all providers)

| Command | Usage |
|---------|-------|
| `gh repo view --json defaultBranchRef` | Detect default branch |
| `git rev-parse --verify <branch>` | Check if branch exists |
| `git checkout -b <branch>` | Create new branch |
| `git commit --allow-empty` | Create scaffold commit |
| `git push -u origin <branch>` | Push branch to remote |
| `gh pr list --head <branch>` | Check for existing PR |
| `gh pr create` | Create the PR |

## Agent Spawn

No agent spawn. This skill executes directly.
