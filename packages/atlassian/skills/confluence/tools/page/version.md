# Version Management

V2-style logical paths only — MCP rewrites `/pages/{id}/versions` to `/content/{id}/version` on Server/DC.

## Rules

1. **Always fetch current page first** to get latest `version.number`
2. Update body must include `version.number = current + 1`
3. On 409 conflict: re-fetch → retry (max 3 times)

## Get Version History

```
Tool: fetch (method: GET)
Endpoint: /pages/{id}/versions
```

## Restore Version (V1/DC only)

```
Tool: fetch (method: POST)
Endpoint: /pages/{id}/versions
Body: { "operationKey": "restore", "params": { "versionNumber": N } }
```

Cloud V2 has no restore endpoint — the upstream API responds 404 for POST to its versions endpoint.

## Version Diff

Compare two versions by fetching each and comparing body content.
