# Cache Actions

## Actions

### ensure

Check if the cache exists and is within TTL. If valid, do nothing. If expired or missing,
automatically refresh.

```
1. Determine project key: --project argument > config.defaults.project_ref
2. Call mcp_tools_cache_get(project_ref, cache_type: "all")
3. If cache exists AND ttl_expired == false:
   → Return cached data (no-op)
4. If cache missing OR ttl_expired == true:
   → Execute refresh flow (see below)
```

### refresh

Force-refresh all cache types regardless of TTL status.

```
1. Determine project key
2. Fetch issue types:
   a. [OP: get_issue_types] project=<projectKey>
   b. For each issue type returned:
      - [OP: get_issue_type_fields] issue_type_id=<issueTypeId>
      - Collect required fields per issue type
   c. Call mcp_tools_cache_set(project_ref, "issue-types", <aggregated data>)

3. Fetch link types:
   a. [OP: get_link_types]
   b. Call mcp_tools_cache_set(project_ref, "link-types", <data>)

4. Fetch project metadata:
   a. [OP: get_projects]
   b. Find matching project by key
   c. Call mcp_tools_cache_set(project_ref, "project-meta", <data>)

5. Fetch workflow data (optional — requires existing issue):
   a. [OP: search_jql] jql="project = <KEY> ORDER BY created DESC", maxResults=1
   b. If result is empty (no issues exist in project):
      → Skip workflows cache. Log: "No issues in project — workflows cache deferred."
      → workflows.json will be lazy-filled on first imbas:imbas-manifest execution.
   c. If result has an issue:
      → [OP: get_transitions] issue_ref=<returned key>
      → Call mcp_tools_cache_set(project_ref, "workflows", <data>)

6. cached_at.json is automatically updated by mcp_tools_cache_set:
   { "cached_at": "<ISO8601 now>", "ttl_hours": 24 }
```

### clear

Delete all cached files for the specified project.

```
1. Determine project key
2. Delete .imbas/<KEY>/cache/ directory contents:
   - project-meta.json
   - issue-types.json
   - link-types.json
   - workflows.json (if exists)
   - cached_at.json
3. Confirm deletion
```
