# Cache Actions

## Actions

### ensure

Check if the cache exists and is within TTL. If valid, do nothing. If expired or missing,
automatically refresh.

```
1. Determine project key: --project argument > config.defaults.project_key
2. Call imbas_cache_get(project_key, cache_type: "all")
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
   a. Call Atlassian MCP: getJiraProjectIssueTypesMetadata(projectKey)
   b. For each issue type returned:
      - Call Atlassian MCP: getJiraIssueTypeMetaWithFields(issueTypeId)
      - Collect required fields per issue type
   c. Call imbas_cache_set(project_key, "issue-types", <aggregated data>)

3. Fetch link types:
   a. Call Atlassian MCP: getIssueLinkTypes
   b. Call imbas_cache_set(project_key, "link-types", <data>)

4. Fetch project metadata:
   a. Call Atlassian MCP: getVisibleJiraProjects
   b. Find matching project by key
   c. Call imbas_cache_set(project_key, "project-meta", <data>)

5. Fetch workflow data:
   a. Call Atlassian MCP: getTransitionsForJiraIssue(issueKey: <any existing issue key>)
   b. Call imbas_cache_set(project_key, "workflows", <data>)

6. cached_at.json is automatically updated by imbas_cache_set:
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
