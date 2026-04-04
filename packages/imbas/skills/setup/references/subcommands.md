# Subcommand Behaviors

## show

1. Call `imbas_config_get` (no field — returns full config).
2. For each configured project key, call `imbas_cache_get` with `cache_type: "all"`.
3. Display:
   - config.json contents (formatted)
   - Cache status per project: cached_at, ttl_expired, available cache types
   - .imbas/ directory size summary

## set-project <KEY>

1. Call `imbas_config_set` with `{ "defaults.project_key": "<KEY>" }`.
2. Execute cache population flow (Step 4 of Init Workflow) for the new project key.
3. Display confirmation with new default project.

## set-language <field> <lang>

1. Validate field is one of: `documents`, `skills`, `jira_content`, `reports`.
2. Call `imbas_config_set` with `{ "language.<field>": "<lang>" }`.
3. Display updated language settings.

## refresh-cache [KEY]

1. Determine project key: argument > config.defaults.project_key.
2. Execute cache population flow (Step 4 of Init Workflow) with force refresh.
3. Display refreshed cache summary.

## clear-temp

1. Delete the `.imbas/.temp/` directory and all contents.
2. Display freed space summary.
