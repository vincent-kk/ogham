# MCP Tools

> **Type**: [DEV] Development mapping  
> **Date**: 2026-04-13  
> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/mcp.md`

---

## 1. Overview

The MCP layer exposes 6 tools under a single server named `"tools"`:

| Tool | Type | Description |
|---|---|---|
| `get` | HTTP | Resource retrieval, GET-based search (CQL) |
| `post` | HTTP | Resource creation, POST-based search (JQL Cloud), file upload |
| `put` | HTTP | Resource modification (PUT or PATCH) |
| `delete` | HTTP | Resource deletion |
| `convert` | Local | ADF/Storage/Wiki Markup <-> Markdown format conversion |
| `setup` | Local | Local web server for auth/connection setup |

**Design principle**: MCP has zero domain knowledge. It does not know what a "Jira issue" or "Confluence page" is. It executes `(method, path, params, body)` tuples as HTTP requests.

---

## 2. Standard Response Envelope

All HTTP tools return the same envelope:

```typescript
interface McpResponse {
  success: boolean;
  status: number;           // HTTP status code
  data: unknown;            // API response body (on success)
  error?: {
    code: string;           // e.g., "UNAUTHORIZED", "RATE_LIMITED"
    message: string;
    retryable: boolean;
    reauth_required?: boolean;  // 401 only: triggers auth form
    details?: unknown;          // Original API error
  };
  pagination?: {
    hasMore: boolean;
    nextCursor?: string;    // Cloud cursor
    startAt?: number;       // Server offset
    total?: number;
  };
}
```

---

## 3. Tool Definitions

### 3.1 `get` — HTTP GET

| Category | Parameter | Type | Required | Description |
|---|---|---|---|---|
| **Skill-injected** | `endpoint` | `string` | Y | API path (e.g., `/rest/api/3/issue/PROJ-123`) |
| | `query_params` | `Record<string, string>` | N | URL query parameters |
| | `expand` | `string[]` | N | Response expansion fields |
| | `headers` | `Record<string, string>` | N | Additional request headers |
| | `accept_format` | `"json" \| "raw"` | N | Response format (default: `"json"`) |
| **MCP auto-injected** | `base_url` | `string` | — | From config, prepended to endpoint |
| | `Authorization` | `string` | — | From stored credentials |
| | `Content-Type` | `string` | — | `application/json` (default) |

**Response processing**:
- If response body contains ADF content and `accept_format` is `"json"`, automatically convert to Markdown
- If `accept_format` is `"raw"`, return original body (binary downloads, etc.)
- `expand` parameter is joined as `expand=field1,field2` in query string

---

### 3.2 `post` — HTTP POST

| Category | Parameter | Type | Required | Description |
|---|---|---|---|---|
| **Skill-injected** | `endpoint` | `string` | Y | API path (e.g., `/rest/api/3/issue`) |
| | `body` | `object` | Y | Request body (JSON) |
| | `headers` | `Record<string, string>` | N | Additional request headers |
| | `content_type` | `string` | N | Body content type override |
| | `content_format` | `"json" \| "markdown"` | N | Body content format hint |
| **MCP auto-injected** | `base_url` | `string` | — | From config |
| | `Authorization` | `string` | — | From stored credentials |

**Body processing**:
- If `content_format: "markdown"` hint is present, MCP converts Markdown content in body to ADF before sending
- If `content_type` is `multipart/form-data`, operates in file upload mode with automatic `X-Atlassian-Token: nocheck` header
- POST-based searches (JQL Cloud: `POST /rest/api/3/search/jql`) use this tool

---

### 3.3 `put` — HTTP PUT/PATCH

| Category | Parameter | Type | Required | Description |
|---|---|---|---|---|
| **Skill-injected** | `endpoint` | `string` | Y | API path |
| | `body` | `object` | Y | Fields to update (JSON) |
| | `method` | `"PUT" \| "PATCH"` | N | HTTP method (default: `"PUT"`) |
| | `headers` | `Record<string, string>` | N | Additional request headers |
| | `content_format` | `"json" \| "markdown"` | N | Body content format hint |
| **MCP auto-injected** | `base_url` | `string` | — | From config |
| | `Authorization` | `string` | — | From stored credentials |

**Body processing**:
- If `content_format: "markdown"`, converts Markdown content to ADF or Storage Format
- Confluence page updates: Skill includes `version.number` in body; MCP passes it through

---

### 3.4 `delete` — HTTP DELETE

| Category | Parameter | Type | Required | Description |
|---|---|---|---|---|
| **Skill-injected** | `endpoint` | `string` | Y | API path |
| | `query_params` | `Record<string, string>` | N | Delete options (e.g., `deleteSubtasks=true`) |
| | `headers` | `Record<string, string>` | N | Additional request headers |
| **MCP auto-injected** | `base_url` | `string` | — | From config |
| | `Authorization` | `string` | — | From stored credentials |

**Response**: Success: `{ success: true, status: 204, data: null }`, Failure: standard error envelope

---

### 3.5 `convert` — Format Conversion Utility

**Not an HTTP tool.** Pure local conversion function.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `from` | `"markdown" \| "adf" \| "storage" \| "wiki"` | Y | Source format |
| `to` | `"markdown" \| "adf" \| "storage" \| "wiki"` | Y | Target format |
| `content` | `string` | Y | Content to convert |

**Supported conversions**:

| From | To | Use Case |
|---|---|---|
| markdown | adf | Writing to Jira Cloud (issue description, comments) |
| markdown | storage | Writing to Confluence (page body) |
| markdown | wiki | Writing to Jira Server/DC |
| adf | markdown | Reading from Jira Cloud |
| storage | markdown | Reading from Confluence |
| wiki | markdown | Reading from Jira Server/DC |

**ADF node type support**: heading, paragraph, bulletList, orderedList, codeBlock, blockquote, table, rule, mention, emoji, mediaGroup/mediaSingle, panel, expand, inlineCard/blockCard, status

**Known information loss**: complex table colspan/rowspan, media node metadata, panel/status colors, textColor marks, layout sections, macro parameters

---

### 3.6 `setup` — Auth/Connection Setup

**Not an HTTP tool.** Launches a local web server for auth configuration.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `mode` | `"new" \| "edit"` | N | Setup mode (default: `"new"`) |
| `prefill` | `object` | N | Pre-filled form values |

**Behavior**: Starts a local HTTP server on `127.0.0.1` (dynamic port), opens the auth setup form in the user's browser. See [auth-ui.md](auth-ui.md) for form design.

**Returns**: Connection test results and saved config status.

---

## 4. Pagination

### Two Models

| Model | Platform | Mechanism |
|---|---|---|
| Cursor-based | Cloud | `nextPageToken` in response → pass as query param |
| Offset-based | Server/DC | `startAt` + `maxResults` → increment `startAt` |

### Processing Strategy: Skill-controlled + MCP auto-detection

```typescript
interface PaginationConfig {
  mode: "cursor" | "offset" | "auto";  // auto: decided by is_cloud
  max_results?: number;                 // Per-page limit (default: 50)
  cursor?: string;                      // Cursor mode: next page token
  start_at?: number;                    // Offset mode: start position
}
```

**Flow**:
1. Skill optionally includes `pagination` parameter in `get`/`post` call
2. `mode: "auto"` → MCP decides based on `is_cloud` config
3. MCP extracts `nextPageToken`, `startAt`, `total` from response
4. Normalized into standard `pagination` response field
5. Skill checks `pagination.hasMore` and decides whether to request next page

**Design rationale**: MCP does NOT auto-fetch all pages. Skill controls how many pages to fetch to prevent memory/time issues with large datasets.

---

## 5. Auth Header Injection

**Core security principle**: Auth tokens are NEVER exposed to LLM context.

```
Skill ──(endpoint, body, headers — NO tokens)──> MCP
                                                   |
                                                   | Internal: inject auth header
                                                   v
                                              HTTP Request
                                              Authorization: Bearer xxx
```

| Auth Type | Platform | Header |
|---|---|---|
| Basic (Cloud) | Cloud | `Basic base64(email:api_token)` |
| Basic (Server) | Server/DC | `Basic base64(username:password)` |
| PAT | Server/DC | `Bearer {personal_token}` |
| OAuth 2.0 | Both | `Bearer {access_token}` |

---

## 6. Rate Limit and Error Handling

### Retry Policy

```typescript
interface RetryPolicy {
  max_retries: 3;
  base_delay_ms: 1000;              // First retry: 1s
  backoff_multiplier: 2;            // Exponential: 1s -> 2s -> 4s
  max_delay_ms: 10000;              // Max wait: 10s
  retry_on: [429, 500, 502, 503, 504];
}
```

- **429**: Use `Retry-After` header if present, otherwise exponential backoff
- **5xx**: Exponential backoff, max 3 retries, then final error

### Error Code Mapping

| HTTP Status | `error.code` | `retryable` | Description |
|---|---|---|---|
| 400 | `BAD_REQUEST` | false | Parameter validation error |
| 401 | `UNAUTHORIZED` | false | Auth failed (triggers reauth flow) |
| 403 | `FORBIDDEN` | false | Insufficient permissions |
| 404 | `NOT_FOUND` | false | Resource does not exist |
| 409 | `CONFLICT` | false | Version conflict (Confluence page etc.) |
| 429 | `RATE_LIMITED` | true | Rate limit exceeded |
| 500-504 | `SERVER_ERROR` | true | Server-side errors |

### Read-Only Mode

When `READ_ONLY_MODE` is enabled, `post`, `put`, `delete` calls return:

```json
{
  "success": false,
  "status": 0,
  "data": null,
  "error": {
    "code": "READ_ONLY",
    "message": "Write operations are disabled in read-only mode.",
    "retryable": false
  }
}
```

---

## 7. Security

### SSRF Prevention

1. **Hostname validation**: Final URL hostname must match configured `base_url` hostname
2. **Private IP blocking**: Block `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `0.0.0.0/8`
3. **Path traversal blocking**: Reject endpoints containing `..`
4. **Protocol enforcement**: `https://` only (exception: `http://` allowed when `ssl_verify: false`)

### Token Masking

Error responses that might contain token information must mask all credential values before returning to the LLM context.

### `search` Tool Non-existence

There is NO dedicated `search` tool. Search operations use existing HTTP tools:
- Jira search (Cloud): `post` — `POST /rest/api/3/search/jql` with JQL in body
- Jira search (Server): `get` — `GET /rest/api/2/search?jql=...`
- Confluence search: `get` — `GET /wiki/rest/api/content/search?cql=...`
