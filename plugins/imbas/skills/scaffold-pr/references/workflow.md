# scaffold-pr Workflow — Provider-agnostic skeleton

This file defines the overall flow. Sub-task fetching (Step 3) is delegated to the
provider-specific workflow file (`jira/workflow.md` or `github/workflow.md`),
selected by `config.provider`. Steps 0, 1, 2, 4 are shared.

## Step 0 — Provider gate

1. Read `config.provider` via `mcp__plugin_imbas_tools__config_get`.
2. If `config.provider === "local"` → emit terminal marker `scaffold-pr BLOCKED: local provider not supported — PR creation requires a remote git host.` and end. Do NOT continue.

## Step 1 — Read issue

1. Invoke `/imbas:read-issue <issue> --depth shallow`.
2. Extract from result: `key`, `summary`, `type`, `status`.

## Step 2 — Load provider workflow

Load the matching provider workflow file (`jira/workflow.md` or `github/workflow.md`) based on `config.provider` resolved in Step 0.

## Step 3 — Fetch sub-tasks (provider-specific)

Delegated to the provider-specific workflow. Each provider returns a list:

```json
[
  {
    "key": "PROJ-124",
    "summary": "Implement auth endpoint",
    "url": "https://..."
  },
  { "key": "PROJ-125", "summary": "Add unit tests", "url": "https://..." }
]
```

If no sub-tasks found, proceed with an empty list (PR body will note "No sub-tasks found").

## Step 4 — Create branch, commit, and PR

The remaining shared steps (branch creation, empty commit, PR build + create) all execute as part of Step 4.

### Step 4.1 — Create branch

1. Determine `base` branch:
   - If `--base` provided → use it.
   - Otherwise → detect repo default branch: `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`.
2. Map issue type to branch prefix:

   | Issue type | Prefix     |
   | ---------- | ---------- |
   | `Story`    | `feature/` |
   | `Bug`      | `bug/`     |
   | `Task`     | `task/`    |
   | Other      | `feature/` |

3. Branch name: `{prefix}{issue-key}` (e.g., `feature/PROJ-123`, `bug/PROJ-456`).
   - For GitHub issues: use the naming defined in `github/workflow.md` —
     `{prefix}{number}` (e.g., `feature/42`; avoids `#` and other special characters).
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

### Step 4.2 — Create empty commit

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

### Step 4.3 — Build PR body and create PR

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

   [<issue-key>: <issue-summary>](issue-url)

   ## Sub-tasks

   - [ ] [<sub-key>: <sub-summary>](sub-url)
   - [ ] [<sub-key>: <sub-summary>](sub-url)
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
