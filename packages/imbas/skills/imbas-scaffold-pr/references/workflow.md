# scaffold-pr Workflow — Provider-agnostic skeleton

This file defines the overall flow. Sub-task fetching (Step 1) is delegated to the
provider-specific workflow file (`jira/workflow.md` or `github/workflow.md`),
selected by `config.provider`. Steps 2–4 are shared.

## Step 0 — Read issue and route provider

1. Invoke `/imbas:imbas-read-issue <issue> --depth shallow`.
2. Extract from result: `key`, `summary`, `type`, `status`.
3. Read `config.provider` via `config_get`.
4. If `config.provider === "local"` → STOP with error: "local provider does not support PR creation."
5. Load the matching provider workflow file for Step 1.

## Step 1 — Fetch sub-tasks (provider-specific)

Delegated to the provider-specific workflow. Each provider returns a list:

```json
[
  { "key": "PROJ-124", "summary": "Implement auth endpoint", "url": "https://..." },
  { "key": "PROJ-125", "summary": "Add unit tests", "url": "https://..." }
]
```

If no sub-tasks found, proceed with an empty list (PR body will note "No sub-tasks found").

## Step 2 — Create branch

1. Determine `base` branch:
   - If `--base` provided → use it.
   - Otherwise → detect repo default branch: `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`.
2. Map issue type to branch prefix:

   | Issue type | Prefix |
   |---|---|
   | `Story` | `feature/` |
   | `Bug` | `bug/` |
   | `Task` | `task/` |
   | Other | `feature/` |

3. Branch name: `{prefix}{issue-key}` (e.g., `feature/PROJ-123`, `bug/PROJ-456`).
   - For GitHub issues: use `{prefix}{repo}#{number}` or `{prefix}issue-{number}` based on context.
4. Check if branch already exists:
   ```bash
   git rev-parse --verify <branch-name> 2>/dev/null
   ```
   - If exists → ASK USER: "Branch `<name>` already exists. Use it? (y/n)"
   - If user confirms → checkout existing branch.
   - If user declines → STOP.
5. Create and checkout:
   ```bash
   git checkout <base> && git pull --ff-only && git checkout -b <branch-name>
   ```

## Step 3 — Create empty commit

Build commit message and create empty commit:

```bash
git commit --allow-empty -m "<message>"
```

Commit message format:
```
chore: scaffold PR for <issue-key>

Ref: <issue-url>
```

Example:
```
chore: scaffold PR for PROJ-123

Ref: https://jira.example.com/browse/PROJ-123
```

## Step 4 — Build PR body and create PR

1. Push the branch:
   ```bash
   git push -u origin <branch-name>
   ```

2. Check if a PR already exists for this branch:
   ```bash
   gh pr list --head <branch-name> --json url --jq '.[0].url'
   ```
   - If PR exists → output existing PR URL and STOP (do not create duplicate).

3. Build PR body from template:

   ```markdown
   ## Issue

   [<issue-key>: <issue-summary>](<issue-url>)

   ## Sub-tasks

   - [ ] [<sub-key>: <sub-summary>](<sub-url>)
   - [ ] [<sub-key>: <sub-summary>](<sub-url>)
   ...
   ```

   If no sub-tasks: replace checklist with `_No sub-tasks found._`

4. PR title: use issue summary directly.

5. Determine draft flag:
   - If `--draft false` → omit `--draft`.
   - Otherwise (default) → include `--draft`.

6. Create PR:
   ```bash
   gh pr create --base <base> --title "<issue-summary>" --draft --body "<body>"
   ```

7. Output the PR URL to the user.
