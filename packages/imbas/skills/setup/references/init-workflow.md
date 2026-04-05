# Init Workflow

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
         "issue_content": "ko",
         "reports": "ko"
       },
       "defaults": {
         "project_ref": "<selected key>",
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
  2. Call config_set with full config.
  3. Confirm config.json created.

Step 4 — Cache population
  1. Create `.imbas/<KEY>/cache/` directory.
  2. Fetch issue types:
     - Call Atlassian MCP: getJiraProjectIssueTypesMetadata(projectKey)
     - For each issue type, call: getJiraIssueTypeMetaWithFields(issueTypeId)
     - Call cache_set(project_ref, "issue-types", <data>)
  3. Fetch link types:
     - Call Atlassian MCP: getIssueLinkTypes
     - Call cache_set(project_ref, "link-types", <data>)
  4. Store project metadata:
     - Call cache_set(project_ref, "project-meta", <data>)

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
