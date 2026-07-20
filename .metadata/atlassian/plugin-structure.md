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
│   ├── confluence.md            # Confluence domain expert agent
│   └── media.md                 # Multimodal keyframe analyst (spawned by media-analysis skill)
├── skills/
│   ├── setup/
│   │   ├── SKILL.md             # Auth/connection setup skill
│   │   └── references/
│   │       ├── auth-types.md
│   │       ├── setup-flow.md
│   │       └── errors.md
│   ├── download/
│   │   ├── SKILL.md             # Attachment download skill
│   │   └── references/
│   │       ├── download-flow.md
│   │       └── errors.md
│   ├── jira/
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
│   ├── confluence/
│   │   ├── SKILL.md             # Confluence API domain router
│   │   └── tools/
│   │       ├── page/
│   │       │   ├── schema.md
│   │       │   ├── hierarchy.md
│   │       │   └── version.md
│   │       ├── search/
│   │       │   ├── schema.md
│   │       │   └── cql-guide.md
│   │       ├── space/
│   │       │   └── schema.md
│   │       ├── comment/
│   │       │   └── schema.md
│   │       ├── attachment/
│   │       │   └── schema.md
│   │       ├── label/
│   │       │   └── schema.md
│   │       ├── analytics/
│   │       │   └── schema.md
│   │       └── user/
│   │           └── schema.md
│   └── media-analysis/
│       ├── SKILL.md             # Media download + multimodal analysis skill
│       ├── scripts/
│       │   └── probe.mjs        # ffprobe wrapper + preset auto-selection
│       ├── presets/             # scene-sieve preset definitions
│       │   ├── index.md
│       │   ├── short-clip.md
│       │   ├── medium-video.md
│       │   ├── long-video.md
│       │   ├── very-long.md
│       │   ├── gif.md
│       │   ├── quick-glance.md
│       │   ├── detailed.md
│       │   ├── hq-capture.md
│       │   ├── inspection.md
│       │   └── screen-recording.md
│       └── references/
│           ├── workflow.md
│           ├── preset-selection.md
│           ├── tools.md
│           └── reference.md
├── hooks/
│   └── hooks.json               # Hook configuration
├── bridge/
│   ├── mcp-server.cjs           # MCP server entry (CJS bundle)
│   └── setup.mjs                # Setup hook bridge
├── src/
│   ├── index.ts                 # Package entry
│   ├── version.ts               # Auto-injected version
│   ├── types/                   # Zod schemas and type definitions
│   ├── constants/               # Paths, defaults, config constants
│   ├── mcp/
│   │   ├── server/
│   │   │   └── server.ts        # MCP server setup + tool registration
│   │   ├── server-entry/        # CJS entry point bundled into bridge/mcp-server.cjs
│   │   ├── shared/              # build-fetch-context, tool-response envelope helpers
│   │   ├── pages/
│   │   │   └── setup/           # HTML setup wizard pages served by the setup tool
│   │   └── tools/
│   │       ├── fetch/           # HTTP GET/POST/PUT/PATCH/DELETE tool
│   │       ├── convert/         # ADF / Storage Format / Wiki ↔ Markdown
│   │       ├── auth_check/      # Stored-credential probe + optional live connectivity test
│   │       └── setup/           # Auth setup tool (local web server)
│   ├── core/
│   │   ├── auth-manager/        # Token storage and injection
│   │   ├── config-manager/      # config.json + credentials.json (plain JSON) management
│   │   ├── connection-tester/   # Live connectivity probe used by auth_check + setup
│   │   ├── environment-resolver/ # is_cloud detection, URL normalization
│   │   └── http-client/         # Fetch wrapper + ssrf-guard, retry, rate limit
│   ├── converter/
│   │   ├── adf-to-markdown/
│   │   ├── markdown-to-adf/
│   │   ├── markdown-to-storage/
│   │   ├── markdown-to-wiki/
│   │   ├── markdown-parsing/    # Shared Markdown AST utilities
│   │   ├── storage-to-markdown/
│   │   └── types/
│   ├── lib/
│   │   ├── file-io.ts           # Local file read/write helpers
│   │   └── logger.ts            # Structured logger
│   └── utils/
│       ├── attach-prefix.ts
│       ├── auth.ts              # Auth header injection helpers (no token storage)
│       ├── ip.ts                # IP / hostname classification (SSRF supporting helper)
│       ├── jira-url.ts          # Jira issue URL parsing
│       ├── path.ts              # Endpoint path normalization
│       ├── site-resolver.ts     # Multi-site selection (Cloud vs Server/DC)
│       ├── transform-request.ts # Request body / header transformation
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
- Single MCP server named `"tools"` — all 4 tools (fetch, convert, auth_check, setup) are registered under this server
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
    "build:mcp": "node scripts/buildMcpServer.mjs",
    "build:hooks": "node scripts/buildHooks.mjs",
    "clean": "rm -rf dist bridge/*.cjs bridge/*.mjs",
    "version:sync": "node ../../scripts/injectVersion.mjs",
    "typecheck": "tsc --noEmit",
    "test:run": "vitest run",
    "lint": "eslint src/",
    "format": "prettier --write ."
  }
}
```

- **tsc**: ESM type-checked output
- **esbuild**: CJS bundle for MCP server (`bridge/mcp-server.cjs`) and ESM bundles for hooks
- **Version**: `src/version.ts` is auto-injected via `scripts/injectVersion.mjs` — never edit directly
