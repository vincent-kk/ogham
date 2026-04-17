# Init Workflow

```
Step 0 — Environment Health Check (non-blocking)
  Check remote tool availability and determine available providers.
  See: references/health-check.md for full procedure.

  0-1. Atlassian MCP check
    - [OP: auth_check] — use any Atlassian identity/auth-check tool,
      or GET /rest/api/3/myself via a generic HTTP tool.
    - On success → "✓ Atlassian connected (user: <displayName>)"
    - On tool-not-found → "✗ Atlassian MCP — not connected"
    - On auth/network error → "✗ Atlassian MCP — connection failed (<reason>)"

  0-2. GitHub CLI check
    - Run: which gh
    - If not found → "✗ GitHub CLI — not installed"
    - If found, run: gh auth status
      - On success → "✓ GitHub CLI authenticated (user: <login>)"
      - On failure → "△ GitHub CLI installed but not authenticated"

  0-3. Result display & provider availability
    Show status summary:

      Remote Tool Status:
        <icon> Atlassian MCP — <status>
        <icon> GitHub CLI — <status>

    Derive available providers from results:
      - Atlassian ✓ → jira available
      - GitHub ✓   → github available
      - local       → always available

    If any tool missing, show:
      "⚠ Remote ticket management requires at least one remote tool.
       Local-only workflows are fully supported without them."

      Show numbered list of missing/failed items:
        [1] Atlassian MCP — register in .mcp.json (scope selection)
        [2] GitHub CLI (gh) — install via npm

      Prompt: "Set up now? Enter numbers (e.g. 1,2) or [skip]:"

      - On skip → proceed to Step 1 with current availability.
      - On selection → execute auto-setup for each selected item
        (see references/health-check.md § Auto-Setup Actions),
        then re-evaluate available providers before Step 1.

Step 1 — Provider selection
  Present available providers as numbered options based on Step 0 results:

    Available providers:
      [1] jira   — Jira Cloud/Server via Atlassian MCP    (requires: Atlassian MCP ✓)
      [2] github — GitHub Issues via gh CLI                (requires: GitHub CLI ✓)
      [3] local  — Local markdown files (no remote needed) (always available)

  Rules:
  - Only show providers whose dependencies were confirmed in Step 0.
  - `local` is always shown.
  - If only `local` is available, still show selection but note:
    "Only local provider is available. Select [3] or set up a remote tool first."
  - If exactly one remote provider is available, recommend it but do not auto-select.
  - Store selected provider for Step 3.

Step 2 — .imbas/ directory creation
  1. Check if .imbas/ exists at project root.
  2. If not, create:
     - .imbas/
     - .imbas/.temp/
  3. Create .imbas/.gitignore with content:
     # imbas auto-generated — do not edit
     *

Step 3 — Project reference selection (provider-specific)

  [jira]
    1. [OP: get_projects]
       → Returns list of projects with key, name, projectType.
    2. Present project list to user as numbered options.
    3. User selects a project (or enters a key manually).
    4. Store selected project key as project_ref.

  [github]
    1. Detect current repo: gh repo view --json nameWithOwner
    2. If in a git repo with remote → suggest detected "owner/repo".
    3. User confirms or enters a different owner/repo.
    4. Store as project_ref (e.g. "ogham-org/ogham-app").

  [local]
    1. Suggest project key from directory name (uppercase, e.g. "OGHAM").
    2. User confirms or enters a custom key.
    3. If key is empty, default to "LOCAL".
    4. Store as project_ref.
    5. Create issue directories:
       - .imbas/<KEY>/issues/stories/
       - .imbas/<KEY>/issues/tasks/
       - .imbas/<KEY>/issues/subtasks/

Step 3.5 — Label Configuration
  1. Load default labels from LabelsConfigSchema defaults.
  2. Display default label table:

     Key              | Value            | Applied When
     -----------------+------------------+-------------------------------
     managed          | imbas-managed    | Issue creation (all types)
     review_pending   | review-pending   | Phase 2 complete
     review_complete  | review-complete  | Review approved
     dev_waiting      | 개발대기          | Phase 3.5 complete
     dev_in_progress  | 개발중            | (external trigger only)
     dev_done         | 개발완료          | (external trigger only)

  3. Prompt: "이 기본 라벨로 진행하시겠습니까? [Yes / Customize]"
     - Yes → use defaults, proceed to Step 3.6
     - Customize → for each label key, show current default and accept new value
       via AskUserQuestion (or equivalent interactive prompt).
       Store customized values for config.labels section.

  Step 3.6 — GitHub Label Provisioning (GitHub provider only)
  [github]
    1. Display: "GitHub 레포에 이 라벨들을 생성하시겠습니까?"
    2. Prompt: "<owner/repo>에 라벨 provisioning? [Yes / Skip]"
       - Yes → for each label value in config.labels:
         - Run: gh label list --repo <owner/repo> --json name
         - If label value NOT in existing list:
           gh label create "<value>" --repo <owner/repo> --color c5def5
         - If label already exists: skip (idempotent)
         Report: "N개 생성, M개 이미 존재."
       - Skip → display: "`imbas-setup labels provision`으로 나중에 생성할 수 있습니다."

  [jira]
    Display: "Jira labels는 free-form으로 별도 provisioning이 필요하지 않습니다."

  [local]
    No label provisioning needed.

Step 4 — config.json creation
  1. Build config object (provider-aware):
     {
       "version": "1.0",
       "provider": "<selected provider>",      ← NEW
       "language": {
         "documents": "ko",
         "skills": "en",
         "issue_content": "ko",
         "reports": "ko"
       },
       "defaults": {
         "project_ref": "<selected key or owner/repo>",
         "llm_model": {
           "validate": "sonnet",
           "split": "sonnet",
           "devplan": "opus"
         },
         "subtask_limits": {
           "max_lines": 200,
           "max_files": 10,
           "review_hours": 1
         }
       },
       // provider-specific section (only one present):
       "jira": { ... },       // when provider = jira
       "github": { ... },     // when provider = github
       // no extra section     // when provider = local
     }

  [jira] section:
     "jira": {
       "issue_types": { "epic": "Epic", "story": "Story", "task": "Task", "subtask": "Sub-task", "bug": "Bug" },
       "workflow_states": { "todo": "To Do", "ready_for_dev": "Ready for Dev", "in_progress": "In Progress", "in_review": "In Review", "done": "Done" },
       "link_types": { "blocks": "Blocks", "split_into": "is split into", "split_from": "split from", "relates_to": "relates to" }
     }

  [github] section (see SPEC-provider-github.md § Config keys):
     "github": {
       "repo": "<owner/repo>",
       "defaultLabels": [],
       "linkTypes": ["blocks", "blocked-by", "split-from", "split-into", "relates"]
     }

  [local] — no provider-specific section.

  2. Call mcp_tools_config_set with full config.
  3. Confirm config.json created.

Step 5 — Cache population (provider-specific)

  [jira]
    1. Create `.imbas/<KEY>/cache/` directory.
    2. Fetch issue types:
       - [OP: get_issue_types] project=<projectKey>
       - For each issue type: [OP: get_issue_type_fields] issue_type_id=<id>
       - Call mcp_tools_cache_set(project_ref, "issue-types", <data>)
    3. Fetch link types:
       - [OP: get_link_types]
       - Call mcp_tools_cache_set(project_ref, "link-types", <data>)
    4. Store project metadata:
       - Call mcp_tools_cache_set(project_ref, "project-meta", <data>)

  [github]
    1. Bootstrap labels: gh label list --repo <owner/repo> --json name
    2. Create missing type/status labels if needed (see SPEC-provider-github.md § Cache).
    3. Cache label inventory via mcp_tools_cache_set.

  [local]
    No cache needed. Display: "Local provider — no remote cache required."

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
     - Config: .imbas/config.json created
     - Cache:
       [jira]   issue-types, link-types, project-meta populated
       [github]  label inventory cached
       [local]   N/A (local provider)
     - .gitignore: updated (if applicable)
  2. Suggest next step: "Run /imbas:imbas-validate <source> to start Phase 1."
```
