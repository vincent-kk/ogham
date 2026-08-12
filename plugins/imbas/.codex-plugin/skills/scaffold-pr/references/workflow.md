# scaffold-pr Workflow — Provider-agnostic skeleton

This file defines the overall flow. Sub-task fetching (Step 3) is delegated to the provider-specific workflow file (`jira/workflow.md` or `github/workflow.md`), selected by `config.provider`. Steps 0, 1, 2, 4 are shared.

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

## Step 4 — Derive fields, write files, run the scaffold script

The git/gh sequence (branch, empty commit, push, PR) is owned by the bundled `scaffold-pr.mjs` — byte-identical to the copy the seiri plugin ships. The LLM derives the fields, writes them to scratch files, and runs one command. Never replay the script's internal git/gh steps as raw commands.

> **Script resolution**: resolve through `${CLAUDE_PLUGIN_ROOT}`; when unset, locate with `Glob(**/skills/scaffold-pr/scripts/scaffold-pr.mjs)`. If the script is not found, abort with an error message.

### Step 4.1 — Derive (LLM)

1. Base branch: use `--base` if provided; otherwise omit the flag — the script resolves the repository default.
2. Map issue type to branch prefix:

   | Issue type | Prefix     |
   | ---------- | ---------- |
   | `Story`    | `feature/` |
   | `Bug`      | `bug/`     |
   | `Task`     | `task/`    |
   | Other      | `feature/` |

   Branch name: `{prefix}{issue-key}` (e.g., `feature/PROJ-123`). For GitHub issues: `{prefix}{number}` (e.g., `feature/42`) per `github/workflow.md`.

3. PR title: the issue summary, verbatim.
4. Commit message:

   ```
   chore: scaffold PR for <issue-key>

   Ref: <issue-url>
   ```

5. PR body:

   ```markdown
   ## Issue

   [<issue-key>: <issue-summary>](issue-url)

   ## Sub-tasks

   - [ ] [<sub-key>: <sub-summary>](sub-url)
   - [ ] [<sub-key>: <sub-summary>](sub-url)
   ```

   If no sub-tasks: replace the checklist with `_No sub-tasks found._`

### Step 4.2 — Write the field files

Write three scratch files — arbitrary text never travels inline through a shell hop: `title.txt` (PR title), `message.txt` (commit message), `body.md` (PR body).

### Step 4.3 — Run the script

```
node "${CLAUDE_PLUGIN_ROOT}/skills/scaffold-pr/scripts/scaffold-pr.mjs" --branch <branch> --title-file <title.txt> --message-file <message.txt> --body-file <body.md> [--base <base>] [--ready]
```

`--draft false` from the skill arguments maps to `--ready` (Draft is the script default).

The reply is one JSON line:

- **Success**: `{ok: true, url, branch, base, existing}`. `existing: true` means an open PR for this branch was found and reused — output that URL and stop; no duplicate is created.
- **Failure**: `{ok: false, code, message, dirtyFiles?}`. Dispatch on `code`:

  | Code                                                                                                        | Action                                                                              |
  | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
  | `BRANCH_EXISTS`                                                                                             | ASK USER: use existing branch? Yes → rerun with `--reuse-branch`. No → STOP.        |
  | `DIRTY_TREE`                                                                                                | ASK USER: continue anyway? Yes → rerun with `--allow-dirty`. Never stash or commit. |
  | `GIT_MISSING` · `NOT_A_REPO` · `GH_MISSING` · `GH_UNAUTHENTICATED` · `BASE_RESOLVE_FAILED`                  | Report the `message` and STOP.                                                      |
  | `SWITCH_FAILED` · `PULL_FAILED` · `COMMIT_FAILED` · `PUSH_FAILED` · `PR_LOOKUP_FAILED` · `PR_CREATE_FAILED` | Report the underlying stderr from `message` and STOP — no raw-git recovery.         |

Output the PR URL to the user.
