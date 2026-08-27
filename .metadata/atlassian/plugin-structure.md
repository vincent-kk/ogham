# Plugin Structure

> **Type**: [ARCH] Self-contained  
> **Date**: 2026-04-13

---

## 1. Directory Layout

```
plugins/atlassian/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── .codex-plugin/
│   └── plugin.json              # Codex plugin manifest
├── .mcp.json                    # MCP server configuration
├── agents/
│   ├── jira.md                  # Jira domain expert agent
│   ├── confluence.md            # Confluence domain expert agent
│   └── media.md                 # Multimodal keyframe analyst (spawned by media-analysis skill)
├── skills/
│   ├── .shared/                  # Shared MCP naming and workflow references
│   ├── setup/                    # Auth/connection setup skill
│   ├── download/                 # Attachment download skill
│   ├── jira/
│   │   ├── SKILL.md             # Jira API domain router
│   │   └── tools/
│   │       ├── comment/
│   │       │   ├── schema.md
│   │       │   ├── jsm-comment.md
│   │       │   └── reply-plugin.md # Server/DC reply-plugin playbook
│   │       └── ...              # Other Jira REST reference capsules
│   ├── confluence/              # Confluence API domain router
│   └── media-analysis/          # Media download + multimodal analysis skill
├── bridge/
│   └── mcp-server.cjs           # Generated MCP server CJS bundle
├── src/
│   ├── index.ts                 # Package entry
│   ├── version.ts               # Auto-injected version
│   ├── types/                   # Zod schemas and type definitions
│   ├── constants/               # Paths, defaults, config constants
│   ├── jira/
│   │   └── commentThread/        # Reply-plugin thread domain recipe
│   │       ├── operations/       # Pure merge and validation operations
│   │       ├── requests/         # Injected Jira request orchestration
│   │       ├── profile/          # Per-site profile persistence
│   │       └── __tests__/        # Fixtures and executable contracts
│   ├── mcp/
│   │   ├── server/
│   │   │   └── server.ts        # MCP server setup + tool registration
│   │   ├── serverEntry/         # CJS entry point bundled into bridge/mcp-server.cjs
│   │   ├── shared/              # Fetch-context and tool-response helpers
│   │   ├── pages/
│   │   │   └── setup/           # HTML setup wizard pages served by the setup tool
│   │   └── tools/
│   │       ├── fetch/           # HTTP GET/POST/PUT/PATCH/DELETE tool
│   │       ├── convert/         # ADF / Storage Format / Wiki ↔ Markdown
│   │       ├── authCheck/       # Stored-credential probe + optional live connectivity test
│   │       ├── setup/           # Auth setup tool (local web server)
│   │       └── jiraCommentThread/ # Fifth, domain-specific MCP adapter
│   ├── core/
│   │   ├── authManager/         # Token storage and injection
│   │   ├── configManager/       # Config and credential persistence
│   │   ├── connectionTester/    # Live connectivity probe
│   │   ├── environmentResolver/ # Deployment detection and URL normalization
│   │   └── httpClient/          # Fetch wrapper, SSRF guard, retry, rate limit
│   ├── converter/               # ADF, Storage, Wiki and Markdown conversion fractals
│   ├── lib/
│   │   ├── fileIo.ts            # Local file read/write helpers
│   │   └── logger.ts            # Structured logger
│   └── utils/
│       ├── attachPrefix.ts
│       ├── auth.ts              # Auth header injection helpers (no token storage)
│       ├── ip.ts                # IP / hostname classification (SSRF supporting helper)
│       ├── jiraUrl.ts           # Jira issue URL parsing
│       ├── path.ts              # Endpoint path normalization
│       ├── siteResolver.ts      # Multi-site selection (Cloud vs Server/DC)
│       ├── transformRequest.ts  # Request body / header transformation
│       └── url.ts               # Generic URL helpers
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── vitest.config.ts
```

---

## 2. plugin.json

```json
{
  "name": "atlassian",
  "version": "0.6.0",
  "description": "Atlassian — Jira and Confluence integration plugin for Claude Code. Full REST API access with domain-expert agents.",
  "author": {
    "name": "Vincent K. Kelvin"
  },
  "repository": "https://github.com/vincent-kk/ogham",
  "homepage": "https://github.com/vincent-kk/ogham/tree/main/plugins/atlassian",
  "license": "MIT",
  "keywords": ["claude-code", "plugin"],
  "skills": "./skills/",
  "mcpServers": "./.mcp.json"
}
```

**Notes**:

- `skills` points to the skills directory containing all SKILL.md files
- `mcpServers` points to the MCP server configuration
- No `agents` field in plugin.json (agents are defined as markdown files in `agents/` directory and discovered by convention)

---

## 3. .mcp.json

```json
{
  "mcpServers": {
    "tools": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"]
    }
  }
}
```

**Notes**:

- Single MCP server named `"tools"` — 4 generic tools (fetch, convert, auth_check, setup) and the approved `jira_comment_thread` domain adapter are registered under this server
- Uses CJS bundle via bridge for Node.js compatibility
- `${CLAUDE_PLUGIN_ROOT}` is resolved by Claude Code at runtime

---

## 4. Data Storage

```
~/.claude/plugins/atlassian/
├── config.json          # Non-secret settings (base_url, auth_type, is_cloud)
├── credentials.json     # Credential storage (plain JSON, user-editable)
└── state.json           # Runtime state (OAuth token cache, API version detection)
```

### config.json Schema

```json
{
  "$schema": "atlassian-mcp-config-v1",
  "jira": {
    "base_url": "https://mycompany.atlassian.net",
    "auth_type": "basic",
    "username": "user@example.com",
    "is_cloud": true,
    "ssl_verify": true,
    "timeout": 30000
  },
  "confluence": {
    "base_url": "https://mycompany.atlassian.net/wiki",
    "auth_type": "basic",
    "username": "user@example.com",
    "is_cloud": true,
    "ssl_verify": true,
    "timeout": 30000
  }
}
```

### credentials.json

```json
{
  "jira": {
    "basic": { "api_token": "ATATT3x..." },
    "pat": { "personal_token": "NjM2..." },
    "oauth": {
      "client_id": "abc123",
      "client_secret": "secret",
      "access_token": "eyJ...",
      "refresh_token": "ref...",
      "expires_at": 1712000000
    }
  },
  "confluence": {
    "basic": { "api_token": "ATATT3x..." }
  }
}
```

**Security**:

- Plain JSON stored locally — user-editable for manual configuration
- Secrets (`api_token`, `password`, `personal_token`, `access_token`, `refresh_token`, `client_secret`) are NEVER stored in `config.json`
- Tokens are NEVER exposed to LLM context

---

## 5. Build Configuration

[`package.json`](../../plugins/atlassian/package.json) is the canonical script list. The full `build` pipeline is `clean → version:sync → build:pages → build:compile → build:mcp → build:compile-plugin`; focused validation uses `typecheck` and `test:run`.

- **tsc**: ESM type-checked output via `build:compile`
- **esbuild**: CJS bundle for the MCP server via `build:mcp`
- **plugin compiler**: host-specific plugin output via `build:compile-plugin`
- **Version**: `src/version.ts` is auto-injected via `scripts/injectVersion.mjs` — never edit directly
