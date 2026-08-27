## Endpoints

| Operation      | HTTP   | Cloud Endpoint                         | Server Endpoint                        |
| -------------- | ------ | -------------------------------------- | -------------------------------------- |
| List comments  | GET    | `/rest/api/3/issue/{key}/comment`      | `/rest/api/2/issue/{key}/comment`      |
| Get comment    | GET    | `/rest/api/3/issue/{key}/comment/{id}` | `/rest/api/2/issue/{key}/comment/{id}` |
| Add comment    | POST   | `/rest/api/3/issue/{key}/comment`      | `/rest/api/2/issue/{key}/comment`      |
| Update comment | PUT    | `/rest/api/3/issue/{key}/comment/{id}` | `/rest/api/2/issue/{key}/comment/{id}` |
| Delete comment | DELETE | `/rest/api/3/issue/{key}/comment/{id}` | `/rest/api/2/issue/{key}/comment/{id}` |

## Parameters

| Parameter | Type       | Required   | Description                                 |
| --------- | ---------- | ---------- | ------------------------------------------- |
| body      | ADF/string | Y (create) | Comment body. Cloud: ADF. Server: text/wiki |

## Cloud vs Server Branching

- **Cloud**: body is ADF JSON. Use `content_format: "markdown"` for auto-conversion
- **Server**: body is plain text or wiki markup

## MCP Tool Mapping

The table uses the Claude/agy full form. On Codex, use `mcp__atlassian__<tool>`.

| Operation          | MCP Tool                                           | Method | Notes                                                                                                                          |
| ------------------ | -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| List (Cloud) / Get | `mcp__plugin_atlassian_tools__fetch`               | GET    | Single comment (`focusedCommentId`) always uses fetch on both deployments                                                      |
| List (Server/DC)   | `mcp__plugin_atlassian_tools__jira_comment_thread` | —      | `mode: "read"` (default). Returns standard comments plus reply-plugin replies merged from the changelog; see `reply-plugin.md` |
| Add                | `mcp__plugin_atlassian_tools__fetch`               | POST   | Use content_format: "markdown"                                                                                                 |
| Update             | `mcp__plugin_atlassian_tools__fetch`               | PUT    |                                                                                                                                |
| Delete             | `mcp__plugin_atlassian_tools__fetch`               | DELETE |                                                                                                                                |

## URL Patterns

| URL Pattern                                             | Route To                                     |
| ------------------------------------------------------- | -------------------------------------------- |
| `...atlassian.net/browse/KAN-27?focusedCommentId=10110` | `GET /rest/api/3/issue/KAN-27/comment/10110` |
| `...atlassian.net/browse/KAN-27?focusedId=10110`        | `GET /rest/api/3/issue/KAN-27/comment/10110` |

## Reply-plugin threads (Server/DC only)

Third-party reply plugins store replies outside the standard comment API. On Server/DC, list comments with `mcp__plugin_atlassian_tools__jira_comment_thread` (Claude/agy) or `mcp__atlassian__jira_comment_thread` (Codex) instead of `fetch`; Cloud sites are rejected by the tool — keep using `fetch` there. JSM customer-visible comments on DC stay on the Service Desk API (`jsm-comment.md`).

| Parameter                    | Mode         | Type     | Description                                                                  |
| ---------------------------- | ------------ | -------- | ---------------------------------------------------------------------------- |
| `mode`                       | all          | string   | `read` (default) · `scan` · `probe` · `save_profile`                         |
| `base_url`                   | all          | string   | Site selector when several Jira sites are configured                         |
| `issue_key`                  | read         | string   | Issue whose thread to return                                                 |
| `start_at`, `max_results`    | read         | number   | Present → one page like `fetch`; absent → all pages (cap 1000, warning)      |
| `expand`                     | read         | string[] | Passed to the comment list request (e.g. `renderedBody`)                     |
| `jql`, `max_issues`          | scan         | —        | Report issues whose changelog carries `Comment` items (default 100, cap 500) |
| `sample_issue_key`           | probe        | string   | An issue the user knows has replies                                          |
| `profile`, `proposal_digest` | save_profile | —        | Exactly the probe's proposal; digest required for `pattern: "changelog"`     |

`read` returns `{ issue, thread[], warnings[], complete, profile, hint? }`. `complete: false` means the changelog was truncated (replies missing); `"unknown"` means it was unavailable. `hint` is present only when the site has no profile — follow `reply-plugin.md`.
