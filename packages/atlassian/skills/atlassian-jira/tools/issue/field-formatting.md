# Field Formatting Rules

## Content Format by Environment

| Environment | Description Field | Comment Body |
|---|---|---|
| Cloud (v3) | ADF (JSON) | ADF (JSON) |
| Server/DC (v2) | Wiki markup / text | Plain text / wiki |

Use `content_format: "markdown"` — MCP auto-converts to the correct format.

## User Fields

- **Cloud**: `{ "accountId": "5b10a2844c20165700ede21g" }`
- **Server**: `{ "name": "jdoe" }` or `{ "key": "jdoe" }`

## Date Fields

- Format: ISO 8601
- Date only: `YYYY-MM-DD`
- DateTime: `YYYY-MM-DDTHH:mm:ss.sssZ`

## Select Fields

- Single: `{ "value": "Option Name" }` or `{ "id": "10001" }`
- Multi: `[{ "value": "A" }, { "value": "B" }]`

## Custom Fields

- Format: `customfield_XXXXX`
- Always fetch metadata first to verify value format
- Use `/rest/api/{version}/field` to list all fields
