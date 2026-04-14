# Auth Check

Authentication check using the `mcp_tools_auth-check` MCP tool.

## Tool

| Tool | Parameter | Default | Description |
|---|---|---|---|
| `mcp_tools_auth-check` | `connection_test` | `false` | When `true`, tests live connectivity and returns user info |

## General Skills Flow (atlassian-jira, atlassian-confluence, atlassian-download)

Optimistic execution — skip pre-flight auth check and attempt the operation directly.
Handle authentication errors only when they occur (HTTP 401 with `reauth_required: true`).

1. Proceed with the requested operation immediately (no upfront `mcp_tools_auth-check` call)
2. If the operation succeeds → done
3. If HTTP 401 (`reauth_required: true`) →
   - Inform user: "Atlassian 인증이 필요합니다. 설정을 진행하시겠습니까?"
   - User agrees → invoke `/atlassian:atlassian-setup`
   - After setup completes → retry the failed operation once
   - User declines → abort skill execution with guidance message

## Setup Skill Flow (atlassian-setup)

1. Call `mcp_tools_auth-check` with `connection_test: true`
2. If `authenticated: false` → proceed with new setup flow immediately
3. If `authenticated: true` →
   - Present existing configuration to user:
     ```
     다음 Atlassian 정보가 등록되어 있습니다:
     - Jira: {base_url} ({user.displayName}, {user.emailAddress})
     - Confluence: {base_url}
     새로운 정보를 설정하시겠습니까?
     ```
   - User agrees → proceed with reconfiguration (mode: `edit`)
   - User declines → end skill

## Response Structure

### connection_test: false

```json
{
  "authenticated": true,
  "services": {
    "jira": { "configured": true, "base_url": "https://xxx.atlassian.net", "auth_type": "basic" },
    "confluence": { "configured": true, "base_url": "https://xxx.atlassian.net/wiki", "auth_type": "basic" }
  }
}
```

### connection_test: true

```json
{
  "authenticated": true,
  "services": {
    "jira": {
      "configured": true,
      "base_url": "https://xxx.atlassian.net",
      "auth_type": "basic",
      "connection": { "success": true, "message": "Connected to jira (Cloud)", "latency_ms": 230 },
      "user": { "displayName": "홍길동", "emailAddress": "hong@example.com" }
    },
    "confluence": {
      "configured": true,
      "base_url": "https://xxx.atlassian.net/wiki",
      "auth_type": "basic",
      "connection": { "success": true, "message": "Connected to confluence (Cloud)", "latency_ms": 180 },
      "user": null
    }
  }
}
```

### Not configured

```json
{ "authenticated": false, "services": {} }
```

## Notes

- `user` field is Jira-only (extracted from `/myself` endpoint). Confluence returns `null`.
- The tool never exposes credentials (tokens, passwords) in responses.
