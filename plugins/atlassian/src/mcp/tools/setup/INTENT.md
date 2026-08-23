## Purpose

MCP setup tool with a local HTTP UI that completes only after the selected configuration scope is persisted.

## Conventions

- Server instance via closure/return value `{ url, close, completion }` only
- Reuse core modules: configManager, authManager, httpClient, environmentResolver
- FE code lives in `src/mcp/pages/settings/` — HTTP API interface only
- Tool name stays `setup` (public MCP interface); only the page/asset layer is named `settings`. Renaming the tool is an interface change — handle separately.

## Boundaries

### Always do

- Mask credentials in responses (use `••••••••••`)
- Test connection before saving config
- Auto-shutdown server after 5 minutes of inactivity
- Bind to 127.0.0.1 only
- Return `config_path` only after config and credentials persist successfully

### Ask first

- Add new API routes
- Change supported auth types

### Never do

- Expose credentials in responses or logs
- Use external HTTP frameworks (Express, Koa)
- Use module-level mutable state
- Include dev-only code (mock-api.js) in production build
- Treat server startup alone as completed setup
