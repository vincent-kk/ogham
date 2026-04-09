# scaffold-pr Workflow — Jira Provider

Loaded when `config.provider === 'jira'`. Handles Step 1 (sub-task fetching)
from the shared skeleton (`../workflow.md`).

## Step 1 — Fetch sub-tasks

1. Read `config.jira.base_url` via `config_get` to build issue URLs.

2. Call `[OP: get_issue] issue_ref=<issue-key>` with subtask fields.
   The Jira issue response includes a `subtasks` array for direct sub-task
   relationships (parent-child).

3. For each sub-task in the response, extract:
   - `key`: sub-task issue key (e.g., `PROJ-124`)
   - `summary`: sub-task title
   - `status`: current workflow status

4. Build the sub-task list with URLs:
   ```json
   [
     {
       "key": "PROJ-124",
       "summary": "Implement auth endpoint",
       "url": "<base_url>/browse/PROJ-124"
     }
   ]
   ```

5. If the `subtasks` array is empty, return an empty list.
   Do NOT search for issue links — only direct sub-task relationships are included.

## Issue URL construction

- Pattern: `{config.jira.base_url}/browse/{issue-key}`
- Example: `https://jira.example.com/browse/PROJ-123`

Return the sub-task list and issue URL to the shared workflow for Steps 2–4.
