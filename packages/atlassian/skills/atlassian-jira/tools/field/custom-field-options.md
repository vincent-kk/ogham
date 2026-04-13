# Custom Field Options (Cloud Only)

## List Options

```
Tool: get
Endpoint: /rest/api/3/field/{fieldId}/context/{contextId}/option
```

## Create Option

```
Tool: post
Endpoint: /rest/api/3/field/{fieldId}/context/{contextId}/option
Body: { "options": [{ "value": "New Option" }] }
```

**Note**: This API is Cloud-only. Server/DC does not expose custom field option management via REST.
