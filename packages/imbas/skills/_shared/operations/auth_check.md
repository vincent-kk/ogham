# [OP: auth_check]

Verify Atlassian connectivity and retrieve the authenticated user's identity.

## REST Endpoint

```
GET /rest/api/3/myself
```

## Response Fields

- `displayName` — User's display name
- `emailAddress` — User's email (fallback identifier)
- `accountId` — Atlassian account ID

## Notes

This is a lightweight endpoint suitable for connection verification.
If the call succeeds, the Atlassian integration is properly configured.

## Used By

- `imbas-setup` — Health check (Step 0) to verify Atlassian connectivity
