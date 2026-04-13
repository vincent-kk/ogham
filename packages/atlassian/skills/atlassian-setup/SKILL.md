---
name: atlassian-setup
user_invocable: true
description: "[atlassian:atlassian-setup] Configure Jira and Confluence authentication and connection settings. Supports Basic Auth, PAT, and OAuth 2.0 for Cloud and Server/DC instances. Auto-triggered on HTTP 401. Trigger: \"atlassian setup\", \"jira 설정\", \"confluence 연결\", \"아틀라시안 설정\""
argument-hint: "[--test] [--reset]"
version: "0.1.0"
complexity: moderate
plugin: atlassian
---

# atlassian-setup

Authentication and connection management for Atlassian products.

## When to Use

- First-time setup of Jira/Confluence connection
- Re-authentication after 401 errors
- Changing connection settings (URL, auth type, credentials)
- Testing connection status

## Setup Flow

1. Get Atlassian instance URL from user
2. Auto-detect environment (see `_shared/environment-detection.md`)
3. Suggest auth method:
   - **Cloud**: Basic (email + API token) or OAuth 2.0
   - **Server/DC**: Basic (username + password), PAT, or OAuth 2.0
4. Collect credentials via `setup` MCP tool
5. Test connection:
   - Jira: `GET /rest/api/*/myself`
   - Confluence: `GET /wiki/rest/api/user/current`
6. Save to secure storage on success

## Auth Types

| Method | Cloud | Server/DC | Config Value |
|---|---|---|---|
| Basic Auth | email + API token | username + password | `basic` |
| PAT | — | personal access token | `pat` |
| OAuth 2.0 (3LO) | Supported | Supported | `oauth` |

## 401 Recovery

Authoritative recovery protocol — router skills (`atlassian-jira`, `atlassian-confluence`) defer here.

1. If OAuth: attempt token refresh first
2. If refresh fails or non-OAuth: trigger this skill for re-authentication
3. After re-auth: retry the original request once

## References

- `../_shared/environment-detection.md` — Cloud vs Server/DC detection
- `../_shared/mcp-tools.md` — Available MCP tools (uses `setup` tool)
- `references/auth-types.md` — Detailed auth type comparison and selection guide
- `references/setup-flow.md` — Step-by-step setup wizard
- `references/errors.md` — Setup-specific error handling and troubleshooting
