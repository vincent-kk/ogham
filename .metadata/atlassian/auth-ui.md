# Auth Setup UI

> **Type**: [ARCH] Self-contained  
> **Date**: 2026-04-13

---

## 1. Overview

The MCP `setup` tool provides a local web server that serves an HTML-based authentication setup form. This enables users to configure their Atlassian connection through a browser interface rather than CLI prompts.

---

## 2. Functional Requirements

### 2.1 Input Parsing

The setup tool accepts an optional JSON input containing pre-filled values:

```typescript
interface SetupInput {
  prefill?: {
    base_url?: string;
    auth_type?: "basic" | "pat" | "oauth";
    username?: string;
    jira_url?: string;
    confluence_url?: string;
  };
  mode?: "new" | "edit";  // "edit" shows existing config with masked tokens
}
```

### 2.2 Endpoint Mode Toggle (Tabs)

The form provides two endpoint configuration modes via tab UI:

| Tab | Name | Description | Default |
|---|---|---|---|
| Tab 1 | Single Endpoint | Jira + Confluence share one base URL | `*.atlassian.net` (Cloud default) |
| Tab 2 | Separate Endpoints | Jira URL ≠ Confluence URL | On-premise typical case |

**Tab 1 — Single Endpoint (Atlassian Cloud)**:
- One URL field: `Base URL` (e.g., `https://mycompany.atlassian.net`)
- Confluence URL is auto-derived as `{base_url}/wiki`

**Tab 2 — Separate Endpoints (On-premise)**:
- Two URL fields: `Jira URL` and `Confluence URL`
- Each can have independent base URLs (e.g., `https://jira.internal.com`, `https://wiki.internal.com`)

### 2.3 Default Values

| Field | Default | Notes |
|---|---|---|
| Base URL | `https://<org>.atlassian.net` | Placeholder shown, not pre-filled |
| Auth Type | `basic` | Most common for Cloud |
| SSL Verify | `true` | — |
| Timeout | `30000` (ms) | — |

### 2.4 Connection Test

After form submission, the setup tool validates the connection:

| Target | Test Endpoint | Success Criteria |
|---|---|---|
| Jira | `GET /rest/api/3/myself` (Cloud) or `GET /rest/api/2/myself` (Server) | HTTP 200 + valid user JSON |
| Confluence | `GET /rest/api/user/current` or `GET /wiki/rest/api/space?limit=1` | HTTP 200 |

**Test sequence**:
1. Submit form data to MCP `setup` tool
2. MCP validates input format
3. MCP attempts connection test for each configured service
4. On success: save to secure storage, return success
5. On failure: return error with specific failing service and HTTP status

### 2.5 Cancel and Reset

- **Cancel**: Closes the form without saving. No changes to existing configuration.
- **Reset** (edit mode): Reverts form to last saved values.
- **Existing data display** (edit mode):
  - Tokens/passwords: displayed as masked (`••••••••••`) — NOT shown in plaintext
  - Non-secret fields (URL, username, auth_type): shown in full for identification
  - User must re-enter tokens to update them; leaving masked = keep existing

---

## 3. Data Flow

```
[Browser: HTML Form]
    |
    | HTTP POST (localhost:PORT/submit)
    v
[MCP setup tool — local web server]
    |
    | 1. Parse form data
    | 2. Validate required fields per auth_type
    | 3. Detect is_cloud from URL pattern
    | 4. Connection test (Jira + Confluence)
    |
    +-- Success --> Save to secure storage --> Return result to LLM
    |               config.json (non-secret)
    |               credentials.enc (secrets)
    |
    +-- Failure --> Return error with details --> Form shows error message
```

---

## 4. HTML Form Structure

### 4.1 Layout

```
+----------------------------------------------------------+
|  Atlassian Connection Setup                               |
+----------------------------------------------------------+
|                                                          |
|  [Tab: Single Endpoint] [Tab: Separate Endpoints]        |
|                                                          |
|  ---- Single Endpoint Tab (active) ----                  |
|                                                          |
|  Base URL:  [https://mycompany.atlassian.net       ]     |
|                                                          |
|  ---- OR Separate Endpoints Tab ----                     |
|                                                          |
|  Jira URL:       [https://jira.internal.com        ]     |
|  Confluence URL: [https://wiki.internal.com        ]     |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  Authentication                                          |
|                                                          |
|  Auth Type: ( ) Basic Auth  ( ) PAT  ( ) OAuth 2.0      |
|                                                          |
|  ---- Basic Auth (selected) ----                         |
|                                                          |
|  Email/Username: [user@example.com                 ]     |
|  API Token:      [••••••••••••••••••••             ]     |
|                                                          |
|  ---- PAT ----                                           |
|                                                          |
|  Personal Access Token: [••••••••••••••••••••       ]    |
|                                                          |
|  ---- OAuth 2.0 ----                                     |
|                                                          |
|  Client ID:     [                                  ]     |
|  Client Secret: [••••••••••••••••••••              ]     |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  Advanced Options (collapsed by default)                 |
|                                                          |
|  SSL Verify:  [x] Enabled                                |
|  Timeout:     [30000] ms                                 |
|  HTTP Proxy:  [                                    ]     |
|  HTTPS Proxy: [                                    ]     |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  [Test Connection]  [Save]  [Cancel]                     |
|                                                          |
|  Status: (connection test result area)                   |
|                                                          |
+----------------------------------------------------------+
```

### 4.2 Conditional Field Visibility

| Auth Type | Visible Fields |
|---|---|
| `basic` | Email/Username, API Token (Cloud) or Password (Server) |
| `pat` | Personal Access Token |
| `oauth` | Client ID, Client Secret |

The form detects Cloud vs Server from the URL:
- `*.atlassian.net` → Cloud: show "Email" + "API Token" labels
- Other → Server/DC: show "Username" + "Password" labels

### 4.3 Validation Rules (Client-side)

| Field | Rule |
|---|---|
| Base URL / Jira URL / Confluence URL | Must be valid URL (starts with `https://` or `http://`) |
| Email/Username | Non-empty when auth_type = basic |
| API Token / Password | Non-empty when auth_type = basic |
| Personal Access Token | Non-empty when auth_type = pat |
| Client ID | Non-empty when auth_type = oauth |
| Client Secret | Non-empty when auth_type = oauth |

---

## 5. Local Web Server

### 5.1 Server Configuration

| Parameter | Value |
|---|---|
| Host | `127.0.0.1` (localhost only) |
| Port | Dynamic (OS-assigned, or fallback range 18700-18799) |
| Protocol | HTTP (localhost only, no TLS needed) |
| Lifetime | Auto-shutdown after successful save or 5-minute timeout |
| CORS | Not needed (same-origin) |

### 5.2 Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Serve the setup HTML form |
| POST | `/submit` | Receive form data, validate, test, save |
| POST | `/test` | Connection test only (no save) |
| GET | `/status` | Return current connection status |

### 5.3 Response Format

```typescript
// POST /submit response
interface SetupResponse {
  success: boolean;
  message: string;
  test_results?: {
    jira?: { success: boolean; user?: string; error?: string };
    confluence?: { success: boolean; error?: string };
  };
}
```

---

## 6. Error States

| Error | User-Visible Message | Action |
|---|---|---|
| Invalid URL format | "Please enter a valid URL starting with https://" | Block submission |
| Connection refused | "Cannot reach {url}. Please check the URL and your network." | Show in status area |
| 401 Unauthorized | "Authentication failed. Please verify your credentials." | Highlight credential fields |
| 403 Forbidden | "Connected but access denied. Check your account permissions." | Show in status area |
| Timeout | "Connection timed out after {timeout}ms." | Show in status area |
| SSL Error | "SSL certificate verification failed. Enable 'Skip SSL Verify' for self-signed certs." | Show in status area |

---

## 7. 401 Re-authentication Flow

When any Skill encounters a 401 during normal operation:

```
1. MCP returns error with reauth_required: true
2. Skill/Agent detects reauth flag
3. Agent informs user: "Authentication expired. Running setup..."
4. MCP setup tool launches local web server
5. Existing config pre-filled (tokens masked)
6. User updates credentials
7. Connection test succeeds
8. Save new credentials
9. Original request retried automatically
```

For OAuth 2.0, automatic token refresh is attempted first:
- Check `expires_at` — if within 5 minutes of expiry, refresh proactively
- Cloud OAuth endpoint: `https://auth.atlassian.com/oauth/token`
- Server/DC endpoint: `{base_url}/rest/oauth2/latest/token`
- If refresh fails → fall back to full re-authentication flow above
