---
name: setup
user_invocable: true
description: "[atlassian:setup] Configure Jira and Confluence authentication and connection settings. Supports Basic Auth, PAT, and OAuth 2.0 for Cloud and Server/DC instances. Auto-triggered on HTTP 401. Trigger: \"atlassian setup\", \"jira 설정\", \"confluence 연결\", \"아틀라시안 설정\""
argument-hint: "[--test] [--reset]"
version: "0.1.0"
complexity: moderate
plugin: atlassian
---

# setup

Authentication and connection management for Atlassian products.

## When to Use

- First-time setup of Jira/Confluence connection
- Re-authentication after 401 errors
- Changing connection settings (URL, auth type, credentials)
- Testing connection status

## Setup Flow

1. Parse arguments and dispatch:
   - `--test` → call `mcp_tools_auth_check` with `connection_test: true` and report status. Skip the wizard.
   - `--reset` → call `mcp_tools_setup` with `mode: "new"` (overwrites existing configuration).
   - No flags → call `mcp_tools_auth_check` first; if `authenticated: false` invoke `mcp_tools_setup` with `mode: "new"`, if `authenticated: true` confirm with the user before invoking `mode: "edit"` (see [`auth_check.md`](../_shared/auth_check.md) Setup Skill Flow).
2. The setup tool launches a local web server and opens the browser automatically (skipped for `--test`)
3. The web UI handles the entire flow: URL input, environment detection, auth method selection, credential collection, connection testing, and saving
4. Report the result to the user based on the MCP tool response

**Do NOT** ask the user for URL, auth type, or credentials via chat — the web UI handles all of this.

## Auth Types

| Method | Cloud | Server/DC | Config Value |
|---|---|---|---|
| Basic Auth | email + API token | username + password | `basic` |
| PAT | — | personal access token | `pat` |
| OAuth 2.0 (3LO) | Supported | Supported | `oauth` |

## 401 Recovery

Authoritative recovery protocol — router skills (`jira`, `confluence`) defer here.

1. If OAuth: attempt token refresh first
2. If refresh fails or non-OAuth: trigger this skill for re-authentication
3. After re-auth: retry the original request once

## References

- `../_shared/auth_check.md` — Pre-flight authentication check
- `../_shared/environment-detection.md` — Cloud vs Server/DC detection
- `../_shared/mcp-tools.md` — Available MCP tools (uses `mcp_tools_setup` tool)
- `references/auth-types.md` — Detailed auth type comparison and selection guide
- `references/setup-flow.md` — Step-by-step setup wizard
- `references/errors.md` — Setup-specific error handling and troubleshooting
