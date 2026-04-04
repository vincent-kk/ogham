---
name: imbas-cache
user_invocable: false
description: >
  Internal skill. Manages Jira project metadata cache (issue types, link types,
  workflows). Auto-refreshes when TTL expires.
version: "1.0.0"
complexity: simple
plugin: imbas
---

# imbas-cache — Jira Metadata Cache Management (Internal)

Internal skill that manages Jira project metadata cache. Stores issue types, link types,
and workflow definitions locally to avoid repeated Atlassian API calls. Auto-refreshes
when the TTL (24 hours) expires. Called by setup, validate, split, and devplan skills.

## Arguments

```
imbas:cache <action> [--project <KEY>]

<action>   : "ensure" | "refresh" | "clear"
--project  : Jira project key (falls back to config.defaults.project_key if omitted)
```

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

5. cached_at.json is automatically updated by imbas_cache_set:
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

## Cache Structure

```
.imbas/<PROJECT-KEY>/cache/
├── project-meta.json     # Project name, key, URL, lead, type
├── issue-types.json      # Issue types with required fields per type
├── link-types.json       # Issue link types (inward/outward names)
├── workflows.json        # Workflow states and transitions
└── cached_at.json        # Cache timestamp and TTL
```

### project-meta.json

```json
{
  "key": "PROJ",
  "name": "My Project",
  "url": "https://myorg.atlassian.net/browse/PROJ",
  "lead": "user@example.com",
  "project_type": "software"
}
```

### issue-types.json

```json
{
  "types": [
    {
      "id": "10001",
      "name": "Epic",
      "subtask": false,
      "fields": {
        "summary": { "required": true },
        "description": { "required": false },
        "customfield_10011": { "name": "Epic Name", "required": true }
      }
    },
    {
      "id": "10002",
      "name": "Story",
      "subtask": false,
      "fields": { "summary": { "required": true } }
    }
  ]
}
```

### link-types.json

```json
{
  "types": [
    { "id": "10000", "name": "Blocks", "inward": "is blocked by", "outward": "blocks" },
    { "id": "10001", "name": "Cloners", "inward": "is cloned by", "outward": "clones" }
  ]
}
```

### cached_at.json

```json
{
  "cached_at": "2026-04-04T10:00:00+09:00",
  "ttl_hours": 24
}
```

## TTL Check Logic

```
1. Read cached_at.json from .imbas/<KEY>/cache/
2. If file missing → cache is expired (needs refresh)
3. Parse cached_at timestamp
4. Calculate: elapsed_hours = (now - cached_at) / 3600000
5. If elapsed_hours >= ttl_hours → expired
6. If elapsed_hours < ttl_hours → valid
```

Default TTL is 24 hours. This is sufficient because Jira project metadata
(issue types, link types, workflows) changes infrequently.

## User Access Path

Users do not invoke this skill directly. Access is through:
- `/imbas:setup show` — displays cache status (cached_at, ttl_expired)
- `/imbas:setup refresh-cache [KEY]` — triggers forced cache refresh

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `imbas_cache_get` | Read cached metadata and check TTL status |
| `imbas_cache_set` | Write fetched metadata to cache files |

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getVisibleJiraProjects` | Fetch project list to find project metadata |
| `getJiraProjectIssueTypesMetadata` | Fetch issue types for the project |
| `getJiraIssueTypeMetaWithFields` | Fetch required fields for each issue type |
| `getIssueLinkTypes` | Fetch all available issue link types |

## Agent Spawn

No agent spawn. This skill executes directly.

## Error Handling

| Error | Action |
|-------|--------|
| No project key (argument or config) | Return error: "No project key specified. Run /imbas:setup first." |
| Atlassian MCP not connected | Return error: "Atlassian MCP not available. Cache refresh requires Jira access." |
| Partial fetch failure | Log warning for failed cache type, continue with others. Return which types succeeded/failed. |
| Cache directory missing | Create .imbas/<KEY>/cache/ automatically, then proceed with refresh. |
| Config not initialized | Return error: "Config not found. Run /imbas:setup init first." |
