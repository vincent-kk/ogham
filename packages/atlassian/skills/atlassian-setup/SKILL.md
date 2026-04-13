---
name: atlassian-setup
description: "Atlassian authentication and connection configuration. Setup wizard for Jira and Confluence integration."
---

# atlassian-setup

Authentication and connection management for Atlassian products.

## When to Use

- First-time setup of Jira/Confluence connection
- Re-authentication after 401 errors
- Changing connection settings (URL, auth type, credentials)
- Testing connection status

## MCP Tools Used

- `setup` — Launch local web server for auth configuration

## Setup Flow

1. Get Atlassian instance URL from user
2. Auto-detect environment: `*.atlassian.net` → Cloud, otherwise → Server/DC
3. Suggest auth method:
   - **Cloud**: Basic (email + API token) or OAuth 2.0
   - **Server/DC**: Basic (username + password), PAT, or OAuth 2.0
4. Collect credentials via setup tool
5. Test connection:
   - Jira: `GET /rest/api/*/myself`
   - Confluence: `GET /rest/api/user/current`
6. Save to secure storage on success

## Auth Types

| Method | Cloud | Server/DC | Config Value |
|---|---|---|---|
| Basic Auth | email + API token | username + password | `basic` |
| PAT | — | personal access token | `pat` |
| OAuth 2.0 (3LO) | Supported | Supported | `oauth` |

## 401 Recovery

When any skill encounters HTTP 401:
1. If OAuth: attempt token refresh first
2. If refresh fails or non-OAuth: trigger this skill for re-authentication
3. After re-auth: retry the original request once

## References

For detailed information, read the appropriate reference file:
- `references/auth-types.md` — Detailed auth type comparison and selection guide
- `references/setup-flow.md` — Step-by-step setup wizard with screenshots
- `references/errors.md` — Setup-specific error handling and troubleshooting
