# TTL Logic and User Access

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
