# Subcommand Behaviors

## show

1. Call `config_get` (no field — returns full config).
2. For each configured project key, call `cache_get` with `cache_type: "all"`.
3. Display:
   - config.json contents (formatted)
   - Cache status per project: cached_at, ttl_expired, available cache types
   - .imbas/ directory size summary

## set-project <KEY>

1. Call `config_set` with `{ "defaults.project_ref": "<KEY>" }`.
2. Execute cache population flow (Step 4 of Init Workflow) for the new project key.
3. Display confirmation with new default project.

## set-language <field> <lang>

1. Validate field is one of: `documents`, `skills`, `issue_content`, `reports`.
2. Call `config_set` with `{ "language.<field>": "<lang>" }`.
3. Display updated language settings.

## refresh-cache [KEY]

1. Determine project key: argument > config.defaults.project_ref.
2. Execute cache population flow (Step 4 of Init Workflow) with force refresh.
3. Display refreshed cache summary.

## set-provider <PROVIDER>

1. Validate provider is one of: `jira`, `github`, `local`.
2. Run health check for the target provider's dependencies.
   - If dependencies not met → display warning and confirm with user.
3. Call `config_set` with `{ "provider": "<PROVIDER>" }`.
4. If switching to `local` from a remote provider:
   - Display banner: "Switching to local will not migrate existing remote issues.
     Export manually before changing provider."
5. If switching to a remote provider:
   - Execute cache population for the new provider (Step 5 of Init Workflow).
6. Display updated provider setting.

## clear-temp

1. Delete the `.imbas/.temp/` directory and all contents.
2. Display freed space summary.
