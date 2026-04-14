# Version Management

## Rules

1. **Always fetch current page first** to get latest `version.number`
2. Update body must include `version.number = current + 1`
3. On 409 conflict: re-fetch → retry (max 3 times)

## Get Version History

```
Tool: fetch (method: GET)
Endpoint: /wiki/rest/api/content/{id}/version
```

## Restore Version

```
Tool: fetch (method: POST)
Endpoint: /wiki/rest/api/content/{id}/version
Body: { "operationKey": "restore", "params": { "versionNumber": N } }
```

## Version Diff

Compare two versions by fetching each and comparing body content.
