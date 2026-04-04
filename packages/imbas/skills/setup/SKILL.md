---
name: imbas-setup
user_invocable: true
description: >
  Initialize .imbas/ directory, create config.json, and cache Jira project metadata.
  Supports subcommands: init, show, set-project, set-language, refresh-cache, clear-temp.
  Trigger: "setup imbas", "imbas 설정", "imbas init"
version: "1.0.0"
complexity: simple
plugin: imbas
---

# imbas-setup — Initialization & Configuration

Initialize the `.imbas/` working directory, configure project settings, and populate
Jira metadata caches. Entry point for all imbas workflows.

## When to Use This Skill

- First-time imbas setup in a project
- Changing the default Jira project
- Refreshing stale Jira metadata caches
- Viewing current configuration
- Cleaning up temporary media files

## Arguments

```
/imbas:setup [subcommand] [args...]

Subcommands:
  init              (default) Interactive initialization — project key, language → config.json + cache
  show              Display config.json + cache status
  set-project <KEY> Change default project + refresh cache
  set-language <field> <lang>  Change language setting (e.g., set-language documents en)
  refresh-cache [KEY]          Force-refresh Jira metadata cache
  clear-temp        Delete .imbas/.temp/ directory (media temp files)
```

## Subcommand Behaviors

### init (default)

Full interactive initialization workflow. See Init Workflow below.

### show

1. Call `imbas_config_get` (no field — returns full config).
2. For each configured project key, call `imbas_cache_get` with `cache_type: "all"`.
3. Display:
   - config.json contents (formatted)
   - Cache status per project: cached_at, ttl_expired, available cache types
   - .imbas/ directory size summary

### set-project <KEY>

1. Call `imbas_config_set` with `{ "defaults.project_key": "<KEY>" }`.
2. Execute cache population flow (Step 4 of Init Workflow) for the new project key.
3. Display confirmation with new default project.

### set-language <field> <lang>

1. Validate field is one of: `documents`, `skills`, `jira_content`, `reports`.
2. Call `imbas_config_set` with `{ "language.<field>": "<lang>" }`.
3. Display updated language settings.

### refresh-cache [KEY]

1. Determine project key: argument > config.defaults.project_key.
2. Execute cache population flow (Step 4 of Init Workflow) with force refresh.
3. Display refreshed cache summary.

### clear-temp

1. Delete the `.imbas/.temp/` directory and all contents.
2. Display freed space summary.

## Init Workflow

```
Step 1 — .imbas/ directory creation
  1. Check if .imbas/ exists at project root.
  2. If not, create:
     - .imbas/
     - .imbas/.temp/
  3. Create .imbas/.gitignore with content:
     # imbas auto-generated — do not edit
     *

Step 2 — Interactive project key selection
  1. Call Atlassian MCP: getVisibleJiraProjects
     → Returns list of projects with key, name, projectType.
  2. Present project list to user as numbered options.
  3. User selects a project (or enters a key manually).
  4. Store selected project key for Step 3.

Step 3 — config.json creation
  1. Build default config object:
     {
       "version": "1.0",
       "language": {
         "documents": "ko",
         "skills": "en",
         "jira_content": "ko",
         "reports": "ko"
       },
       "defaults": {
         "project_key": "<selected key>",
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
       "jira": {
         "issue_types": { "epic": "Epic", "story": "Story", "task": "Task", "subtask": "Sub-task", "bug": "Bug" },
         "workflow_states": { "todo": "To Do", "ready_for_dev": "Ready for Dev", "in_progress": "In Progress", "in_review": "In Review", "done": "Done" },
         "link_types": { "blocks": "Blocks", "split_into": "is split into", "split_from": "split from", "relates_to": "relates to" }
       },
       "media": {
         "scene_sieve_command": "npx -y @lumy-pack/scene-sieve",
         "temp_dir": ".temp",
         "max_frames": 20,
         "default_preset": "medium-video"
       }
     }
  2. Call imbas_config_set with full config.
  3. Confirm config.json created.

Step 4 — Cache population
  1. Create .imbas/<KEY>/cache/ directory.
  2. Fetch issue types:
     - Call Atlassian MCP: getJiraProjectIssueTypesMetadata(projectKey)
     - For each issue type, call: getJiraIssueTypeMetaWithFields(issueTypeId)
     - Call imbas_cache_set(project_key, "issue-types", <data>)
  3. Fetch link types:
     - Call Atlassian MCP: getIssueLinkTypes
     - Call imbas_cache_set(project_key, "link-types", <data>)
  4. Store project metadata:
     - Call imbas_cache_set(project_key, "project-meta", <data>)

Step 5 — .gitignore guard
  1. Check if .git directory exists at project root.
  2. If yes, run: git check-ignore -q .imbas
  3. If .imbas is NOT ignored:
     - Append ".imbas/" to project root .gitignore
     - Create .gitignore if it does not exist

Step 6 — Result display
  1. Show summary:
     - Project: <KEY> (<project name>)
     - Config: .imbas/config.json created
     - Cache: issue-types, link-types, project-meta populated
     - .gitignore: updated (if applicable)
  2. Suggest next step: "Run /imbas:validate <source> to start Phase 1."
```

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `imbas_config_get` | Read current config.json (show subcommand) |
| `imbas_config_set` | Create or update config.json fields |
| `imbas_cache_set` | Write Jira metadata to cache files |

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getVisibleJiraProjects` | List available Jira projects for selection |
| `getJiraProjectIssueTypesMetadata` | Fetch issue types for selected project |
| `getJiraIssueTypeMetaWithFields` | Fetch required fields per issue type |
| `getIssueLinkTypes` | Fetch available issue link types |

## Agent Spawn

No agent spawn required. This skill executes directly.

## Error Handling

| Error | Action |
|-------|--------|
| Atlassian MCP not connected | Display: "Atlassian MCP server is not available. Connect it first, then run /imbas:setup again." |
| getVisibleJiraProjects returns empty | Display: "No Jira projects found. Check your Atlassian permissions." |
| .imbas/ already exists (on init) | Ask user: "Existing .imbas/ found. Overwrite config? (y/n)" — only overwrites config.json, preserves runs/ |
| Cache fetch partial failure | Log warning for failed cache type, continue with others. Display which caches failed. |
| Invalid project key | Display: "Project <KEY> not found in Jira. Available projects: ..." |

## State Transitions

This skill does not interact with run state (state.json). It manages config.json and cache files only.

- Creates: `.imbas/config.json`, `.imbas/<KEY>/cache/*.json`
- Modifies: `.imbas/config.json` (set-project, set-language)
- Deletes: `.imbas/.temp/` (clear-temp only)
