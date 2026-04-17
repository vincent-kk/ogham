# Subcommand Behaviors

## show

1. Call `mcp_tools_config_get` (no field — returns full config).
2. For each configured project key, call `mcp_tools_cache_get` with `cache_type: "all"`.
3. Display:
   - config.json contents (formatted)
   - Cache status per project: cached_at, ttl_expired, available cache types
   - .imbas/ directory size summary

## set-project <KEY>

1. Call `mcp_tools_config_set` with `{ "defaults.project_ref": "<KEY>" }`.
2. Execute cache population flow (Step 4 of Init Workflow) for the new project key.
3. Display confirmation with new default project.

## set-language <field> <lang>

1. Validate field is one of: `documents`, `skills`, `issue_content`, `reports`.
2. Call `mcp_tools_config_set` with `{ "language.<field>": "<lang>" }`.
3. Display updated language settings.

## refresh-cache [KEY]

1. Determine project key: argument > config.defaults.project_ref.
2. Execute cache population flow (Step 4 of Init Workflow) with force refresh.
3. Display refreshed cache summary.

## set-provider <PROVIDER>

1. Validate provider is one of: `jira`, `github`, `local`.
2. Run health check for the target provider's dependencies.
   - If dependencies not met → display warning and confirm with user.
3. Call `mcp_tools_config_set` with `{ "provider": "<PROVIDER>" }`.
4. If switching to `local` from a remote provider:
   - Display banner: "Switching to local will not migrate existing remote issues.
     Export manually before changing provider."
5. If switching to a remote provider:
   - Execute cache population for the new provider (Step 5 of Init Workflow).
6. Display updated provider setting.

## labels [show | edit | provision | sync]

### labels show

1. Call `mcp_tools_config_get` with field `"labels"`.
2. Display label table:

   Key              | Value            | Applied When
   -----------------+------------------+-------------------------------
   managed          | <value>          | Issue creation (all types)
   review_pending   | <value>          | Phase 2 complete
   review_complete  | <value>          | Review approved
   dev_waiting      | <value>          | Phase 3.5 complete
   dev_in_progress  | <value>          | (external trigger only)
   dev_done         | <value>          | (external trigger only)

### labels edit

1. Display current labels (same as `labels show`).
2. For each label key, prompt with current value → accept new value or keep existing.
3. Call `mcp_tools_config_set` with updated `labels` section.
4. Display confirmation with updated values.

### labels provision (GitHub only)

1. If `config.provider !== 'github'`:
   Display: "Provisioning은 GitHub 전용입니다. Jira labels는 free-form으로 자동 생성됩니다."
   Return.
2. Load `config.labels` values via `mcp_tools_config_get`.
3. Run: `gh label list --repo <config.github.repo> --json name` → parse existing label names.
4. Compute missing labels: config label values NOT in existing set.
5. For each missing label:
   `gh label create "<value>" --repo <config.github.repo> --color c5def5`
6. Report: "N개 생성, M개 이미 존재."

### labels sync

1. Load `config.labels` values via `mcp_tools_config_get`.
2. [github]
   - Run: `gh label list --repo <config.github.repo> --json name` → existing set.
   - Compare config label values against existing:
     - Missing in repo: list with "⚠ Missing" marker.
     - Present in repo: list with "✓ Synced" marker.
   - Display summary table. If missing labels found, suggest `imbas-setup labels provision`.
3. [jira]
   Display: "Jira labels는 free-form — sync 해당 없음."
4. [local]
   Display: "Local provider — sync 해당 없음."

## clear-temp

1. Delete the `.imbas/.temp/` directory and all contents.
2. Display freed space summary.
