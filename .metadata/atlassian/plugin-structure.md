# Plugin Structure

> **Type**: [ARCH] Self-contained  
> **Date**: 2026-04-13

---

## 1. Directory Layout

```
packages/atlassian/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── .mcp.json                    # MCP server configuration
├── agents/
│   ├── jira.md                  # Jira domain expert agent
│   └── confluence.md            # Confluence domain expert agent
├── skills/
│   ├── atlassian-setup/
│   │   ├── SKILL.md             # Auth/connection setup skill
│   │   └── references/
│   │       ├── auth-types.md
│   │       ├── setup-flow.md
│   │       └── errors.md
│   ├── atlassian-download/
│   │   ├── SKILL.md             # Attachment download skill
│   │   └── references/
│   │       ├── download-flow.md
│   │       └── errors.md
│   ├── atlassian-jira/
│   │   ├── SKILL.md             # Jira API domain router
│   │   └── tools/
│   │       ├── issue/
│   │       │   ├── schema.md
│   │       │   ├── field-formatting.md
│   │       │   └── examples.md
│   │       ├── search/
│   │       │   ├── schema.md
│   │       │   └── jql-guide.md
│   │       ├── transition/
│   │       │   └── schema.md
│   │       ├── comment/
│   │       │   ├── schema.md
│   │       │   └── jsm-comment.md
│   │       ├── agile/
│   │       │   └── schema.md
│   │       ├── project/
│   │       │   └── schema.md
│   │       ├── field/
│   │       │   ├── schema.md
│   │       │   └── custom-field-options.md
│   │       ├── link/
│   │       │   └── schema.md
│   │       ├── worklog/
│   │       │   └── schema.md
│   │       ├── attachment/
│   │       │   └── schema.md
│   │       ├── user/
│   │       │   └── schema.md
│   │       ├── watcher/
│   │       │   └── schema.md
│   │       ├── jsm/
│   │       │   ├── schema.md
│   │       │   ├── sla-calculation.md
│   │       │   └── forms.md
│   │       ├── development-info/
│   │       │   └── schema.md
│   │       └── metrics/
│   │           └── schema.md
│   └── atlassian-confluence/
│       ├── SKILL.md             # Confluence API domain router
│       └── tools/
│           ├── page/
│           │   ├── schema.md
│           │   ├── hierarchy.md
│           │   └── version.md
│           ├── search/
│           │   ├── schema.md
│           │   └── cql-guide.md
│           ├── space/
│           │   └── schema.md
│           ├── comment/
│           │   └── schema.md
│           ├── attachment/
│           │   └── schema.md
│           ├── label/
│           │   └── schema.md
│           ├── analytics/
│           │   └── schema.md
│           └── user/
│               └── schema.md
├── hooks/
│   └── hooks.json               # Hook configuration
├── bridge/
│   ├── mcp-server.cjs           # MCP server entry (CJS bundle)
│   └── setup.mjs                # Setup hook bridge
├── src/
│   ├── index.ts                 # Package entry
│   ├── version.ts               # Auto-injected version
│   ├── types/
│   │   ├── index.ts
│   │   ├── config.ts            # Connection/auth config types
│   │   ├── mcp.ts               # McpResponse, tool param types
│   │   └── convert.ts           # Format conversion types
│   ├── mcp/
│   │   ├── index.ts
│   │   ├── server/
│   │   │   ├── index.ts
│   │   │   └── server.ts        # MCP server setup + tool registration
│   │   ├── server-entry/
│   │   │   ├── index.ts
│   │   │   └── server-entry.ts  # CJS entry point
│   │   └── tools/
│   │       ├── index.ts
│   │       ├── fetch/
│   │       │   ├── index.ts
│   │       │   └── fetch.ts     # HTTP GET/POST/PUT/PATCH/DELETE tool
│   │       ├── convert/
│   │       │   ├── index.ts
│   │       │   └── convert.ts   # Format conversion tool
│   │       └── setup/
│   │           ├── index.ts
│   │           └── setup.ts     # Auth setup tool (local web server)
│   ├── core/
│   │   ├── index.ts
│   │   ├── auth-manager/
│   │   │   ├── index.ts
│   │   │   └── auth-manager.ts  # Token storage, injection, refresh
│   │   ├── config-manager/
│   │   │   ├── index.ts
│   │   │   └── config-manager.ts # config.json / credentials.enc management
│   │   ├── environment-resolver/
│   │   │   ├── index.ts
│   │   │   └── environment-resolver.ts  # is_cloud detection, URL normalization
│   │   └── http-client/
│   │       ├── index.ts
│   │       └── http-client.ts   # Fetch wrapper with retry, rate limit
│   ├── converter/
│   │   ├── index.ts
│   │   ├── adf-to-markdown.ts   # ADF -> Markdown
│   │   ├── markdown-to-adf.ts   # Markdown -> ADF
│   │   ├── storage-to-markdown.ts # Storage Format -> Markdown
│   │   ├── markdown-to-storage.ts # Markdown -> Storage Format
│   │   └── wiki-markup.ts       # Wiki Markup <-> Markdown
│   ├── setup-ui/
│   │   ├── index.ts
│   │   ├── web-server.ts        # Local HTTP server for setup form
│   │   └── templates/
│   │       └── setup.html       # Auth setup HTML form
│   └── utils/
│       ├── index.ts
│       ├── url-validator.ts     # SSRF prevention, path traversal check
│       └── retry.ts             # Exponential backoff retry logic
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
  "version": "0.1.0",
  "description": "Atlassian — Jira and Confluence integration plugin for Claude Code. Full REST API access with domain-expert agents.",
  "author": {
    "name": "Vincent K. Kelvin"
  },
  "repository": "https://github.com/vincent-kk/ogham",
  "homepage": "https://github.com/vincent-kk/ogham/tree/main/packages/atlassian",
  "license": "MIT",
  "keywords": [
    "claude-code",
    "plugin"
  ],
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
      "args": [
        "${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"
      ]
    }
  }
}
```

**Notes**:
- Single MCP server named `"tools"` — all 3 tools (fetch, convert, setup) are registered under this server
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

Following the ogham monorepo conventions:

```json
{
  "scripts": {
    "build": "yarn clean && yarn version:sync && tsc && yarn build:hooks && yarn build:mcp",
    "build:mcp": "node scripts/build-mcp-server.mjs",
    "build:hooks": "node scripts/build-hooks.mjs",
    "clean": "rm -rf dist bridge/*.cjs bridge/*.mjs",
    "version:sync": "node ../../scripts/inject-version.mjs",
    "typecheck": "tsc --noEmit",
    "test:run": "vitest run",
    "lint": "eslint src/",
    "format": "prettier --write ."
  }
}
```

- **tsc**: ESM type-checked output
- **esbuild**: CJS bundle for MCP server (`bridge/mcp-server.cjs`) and ESM bundles for hooks
- **Version**: `src/version.ts` is auto-injected via `scripts/inject-version.mjs` — never edit directly
