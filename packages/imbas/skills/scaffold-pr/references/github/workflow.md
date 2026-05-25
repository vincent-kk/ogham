# scaffold-pr Workflow — GitHub Provider

Loaded when `config.provider === 'github'`. Handles Step 1 (sub-task fetching)
from the shared skeleton (`../workflow.md`).

## Step 1 — Fetch sub-tasks

1. Parse issue reference into `owner/repo` and issue number `N`.
   Accept `owner/repo#N` or bare `#N` (using `config.github.repo`).

2. Fetch the issue body:
   ```bash
   gh issue view <N> --repo <owner/repo> --json body,url --jq '{body: .body, url: .url}'
   ```

3. Parse the issue body for the `## Sub-tasks` section.
   Extract task-list items matching the pattern:
   ```
   - [ ] #<number> <optional-title>
   - [x] #<number> <optional-title>
   ```

4. For each referenced issue number, fetch its title:
   ```bash
   gh issue view <sub-number> --repo <owner/repo> --json title,url --jq '{title: .title, url: .url}'
   ```

5. Build the sub-task list:
   ```json
   [
     {
       "key": "#42",
       "summary": "Implement auth endpoint",
       "url": "https://github.com/owner/repo/issues/42"
     }
   ]
   ```

6. If no `## Sub-tasks` section or no task-list items found, return an empty list.

## Issue URL

Obtained directly from `gh issue view` response (`url` field).

## Branch naming

For GitHub issues, the branch name uses the format:
- `{prefix}{number}` (e.g., `feature/42`, `bug/15`)

This avoids special characters in branch names while remaining identifiable.

Return the sub-task list and issue URL to the shared workflow for Steps 2–4.
