# Error Handling Protocol

Standard HTTP error handling for all Atlassian API operations.

| HTTP Status | Action |
|---|---|
| 400 Bad Request | Inspect error body — usually field validation failure. Check domain `schema.md` for required fields |
| 401 Unauthorized | Invoke `atlassian-setup` skill for re-authentication, then retry once. See `atlassian-setup` 401 Recovery for full protocol |
| 403 Forbidden | Permission denied — check project role, space permission, or JSM agent access. Do not retry |
| 404 Not Found | Resource not found — verify issue key, page ID, project key, or resource ID |
| 429 Too Many Requests | Rate limited — wait for `Retry-After` header value, then retry with exponential backoff |
| 500 / 503 | Atlassian service error — retry once, then report to user |
