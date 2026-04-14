## Purpose

MCP setup tool with local HTTP server for Atlassian auth configuration UI.

## Structure

| Directory | Role |
|---|---|
| `web-server/` | node:http server, closure pattern, 5min auto-shutdown |
| `connection-tester/` | Jira/Confluence connection test via core modules |
| `__generated__/` | Build-time generated files (setup-html.ts) |
| `__tests__/` | Unit tests for all sub-organs |

## Conventions

- Server instance via closure/return value `{ url, close }` only
- Reuse core modules: config-manager, auth-manager, http-client, environment-resolver
- FE code lives in `src/mcp/pages/setup/` — HTTP API interface only

## Boundaries

### Always do

- Mask credentials in responses (use `••••••••••`)
- Test connection before saving config
- Auto-shutdown server after 5 minutes of inactivity
- Bind to 127.0.0.1 only

### Ask first

- Add new API routes
- Change supported auth types

### Never do

- Expose credentials in responses or logs
- Use external HTTP frameworks (Express, Koa)
- Use module-level mutable state
- Include dev-only code (mock-api.js) in production build
