# MCP Fetch Contract

## Tool list

Five tools, registered by the plugin MCP server. Names below are the Claude/agy form; the Codex adapter registers the same server as `atlassian`, so there the tools appear as `mcp__atlassian__<tool>`.

| Tool                                          | Purpose                                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `mcp__plugin_atlassian_tools__fetch`          | HTTP request to a configured site — prefix attachment, deployment rewriting, body/response conversion                 |
| `mcp__plugin_atlassian_tools__convert`        | Local conversion: adf↔markdown, storage↔markdown, markdown→wiki, adf↔storage                                          |
| `mcp__plugin_atlassian_tools__auth_check`     | Configured sites and optional live connection test — see [`setup`](../setup/SKILL.md#authentication-check)            |
| `mcp__plugin_atlassian_tools__setup`          | Browser-based setup wizard — used only by the `setup` skill                                                           |
| `mcp__plugin_atlassian_tools__comment_thread` | Jira Server/DC comments with reply-plugin replies merged in — see [`comment schema`](../jira/tools/comment/schema.md) |

## Fetch parameters

| Parameter        | Type                           | Notes                                                                                                                                                                                                                    |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `method`         | `GET POST PUT PATCH DELETE`    | Required                                                                                                                                                                                                                 |
| `endpoint`       | string                         | Required. Logical or pass-through path; routing is defined in the selected service's skill                                                                                                                               |
| `service`        | `jira \| confluence`           | Explicit service selector; omission and detection rules are in [`Confluence`](../confluence/SKILL.md#call-contract)                                                                                                      |
| `base_url`       | url                            | Site selector when several sites of one service are configured                                                                                                                                                           |
| `body`           | object \| string               | POST/PUT/PATCH only; GET/DELETE with a body is rejected                                                                                                                                                                  |
| `query_params`   | Record<string,string>          | GET/DELETE only — silently dropped on POST/PUT/PATCH (put them in the path instead)                                                                                                                                      |
| `expand`         | string[]                       | GET only; joined with commas into `expand=`. Overrides `query_params.expand`                                                                                                                                             |
| `headers`        | Record<string,string>          | Extra headers                                                                                                                                                                                                            |
| `accept_format`  | `json` (default) \| `raw`      | `json`: ADF `description`/`body` fields in GET responses gain a `*_markdown` twin. `raw`: no post-processing; use with `save_to_path`                                                                                    |
| `content_format` | `json` (default) \| `markdown` | POST/PUT/PATCH only. `markdown` converts `description`, `body`, and `fields.description` to the site's native format; see the selected service's skill for that format                                                   |
| `content_type`   | string                         | POST only; sets `Content-Type`                                                                                                                                                                                           |
| `save_to_path`   | string                         | GET only. Always resolved under `<project>/.temp/`; `..` segments and paths outside the project are rejected. Downloads afresh and overwrites; returns `{ saved_to, size_bytes, content_type }` with `saved_to` absolute |

## Automatic behavior

- `X-Atlassian-Token: no-check` is added to multipart POSTs and to every non-GET request on Server/DC.
- 429 and 5xx are retried up to 3 times (honoring `Retry-After`, 10 s cap) before the response reaches you.
- **No attachment upload.** The tool sends JSON or string bodies only; there is no multipart encoding or local file reading.
- Router skills (`jira`, `confluence`, `download`) execute optimistically, with no pre-flight call.

## Response envelope

- Success: `{ success: true, status, data }`.
- HTTP error: `{ success: false, status, data: null, error: { code, message, retryable, reauth_required?, details } }` — `error.reauth_required: true` appears only on 401.
- Handler rejection (no configuration, GET with body, unsupported deployment endpoint, …): tool error text `Error: <message>`.

Failures: see `error-handling.md`.
