# Init Workflow

```
Step 0 — Environment Health Check (non-blocking)
  Check remote tool availability and determine available providers.
  See: references/health-check.md for full procedure.

  0-1. Atlassian MCP check
    - [OP: auth_check] — use any Atlassian identity/auth_check tool,
      or GET /rest/api/3/myself via a generic HTTP tool.
  0-2. GitHub CLI check
    - which gh → gh auth status
  0-3. Result display & provider availability
    Show the status summary exactly as before (see health-check.md),
    offer auto-setup for missing items ("Set up now? 1,2 or [skip]"),
    re-evaluate availability after any auto-setup.

    Derive: jira_available / github_available (local is always available).

Step 1 — Session data prefetch (feeds the settings page)
  [if jira_available]
    [OP: get_projects] → jira_projects = [{ key, name }] (cap at ~50).
    On failure: proceed without a list (the page falls back to a key input).
  [if github_available]
    gh repo view --json nameWithOwner → github_repo = "owner/repo".
    Outside a git repo or on failure: omit.

Step 2 — .imbas/ directory creation
  1. Check if .imbas/ exists at project root.
  2. If not, create:
     - .imbas/
     - .imbas/.temp/
  3. Create .imbas/.gitignore with content:
     # imbas auto-generated — do not edit
     *

Step 3 — Settings Page (browser; the ONLY interactive configuration step)
  Call the MCP tool with the ABSOLUTE workspace path:

    mcp__plugin_imbas_tools__open_settings({
      project_root: "<absolute-cwd>",
      wait_seconds: 300,
      bootstrap: {
        providers: { jira: <jira_available>, github: <github_available> },
        jira_projects: <from Step 1, when fetched>,
        github_repo: "<from Step 1, when detected>"
      }
    })

  The tool opens the local settings page and BLOCKS inside the call until
  the user saves, closes the page, or the wait elapses. The page edits the
  full config in one form: provider, project reference, lifecycle labels
  (with a github-only "provision labels after save" checkbox), languages,
  llm models, subtask limits, and provider-specific advanced sections.
  The server persists .imbas/config.json on Save — the skill does NOT
  write config in this flow.

  Dispatch on result.status:
  - saved   → result.summary = { configWritten, provider, projectRef,
              provisionLabels }. Continue to Step 4.
  - pending → call open_settings ONCE more (same arguments; the running
              server is reused, no new browser tab). If still pending,
              surface result.url and STOP — re-running /imbas:setup
              resumes against the saved (or unchanged) config.
  - closed  → the user closed without saving. Report that the existing
              config is unchanged and STOP.

Step 4 — GitHub label provisioning (only when summary.provider == "github"
          AND summary.provisionLabels == true)
  1. Load config.labels via mcp__plugin_imbas_tools__config_get.
  2. gh label list --repo <repo> --json name → existing set.
  3. For each config label value NOT in existing:
     gh label create "<value>" --repo <repo> --color c5def5
  4. Report: "N created, M already existed."
  (Unchecked box → skip silently; `setup labels provision` remains available.)

Step 5 — Cache population (provider-specific, from the saved config)
  Read the saved config via mcp__plugin_imbas_tools__config_get first.

  [jira]
    1. Create `.imbas/<KEY>/cache/` directory.
    2. Fetch issue types:
       - [OP: get_issue_types] project=<projectKey>
       - For each issue type: [OP: get_issue_type_fields] issue_type_id=<id>
       - Call mcp__plugin_imbas_tools__cache_set(project_ref, "issue-types", <data>)
    3. Fetch link types:
       - [OP: get_link_types]
       - Call mcp__plugin_imbas_tools__cache_set(project_ref, "link-types", <data>)
    4. Store project metadata:
       - Call mcp__plugin_imbas_tools__cache_set(project_ref, "project-meta", <data>)

  [github]
    1. Bootstrap labels: gh label list --repo <owner/repo> --json name
    2. Create missing type/status labels if needed (see SPEC-provider-github.md § Cache).
    3. Cache label inventory via mcp__plugin_imbas_tools__cache_set.

  [local]
    1. Create issue directories:
       - .imbas/<KEY>/issues/stories/
       - .imbas/<KEY>/issues/tasks/
       - .imbas/<KEY>/issues/subtasks/
    2. No remote cache needed. Display: "Local provider — no remote cache required."

Step 6 — .gitignore guard
  1. Check if .git directory exists at project root.
  2. If yes, run: git check-ignore -q .imbas
  3. If .imbas is NOT ignored:
     - Append ".imbas/" to project root .gitignore
     - Create .gitignore if it does not exist

Step 7 — Result display
  1. Show summary:
     - Provider: <provider>
     - Project: <project_ref>
     - Config: .imbas/config.json saved via settings page
     - Labels: provisioned (N created) | skipped
     - Cache:
       [jira]   issue-types, link-types, project-meta populated
       [github]  label inventory cached
       [local]   issue directories created
     - .gitignore: updated (if applicable)
  2. Suggest next step: "Run /imbas:validate <source> to start Phase 1."
```

## Headless / CI fallback

`open_settings` needs a local browser. Automation that cannot open one
configures directly instead: `mcp__plugin_imbas_tools__config_set` with dot-path
updates (e.g. `{ "provider": "local", "defaults.project_ref": "KEY" }`),
then continue from Step 5.
