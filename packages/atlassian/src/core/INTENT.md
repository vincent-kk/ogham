## Purpose

Shared infrastructure modules for MCP tools: config, auth, environment detection, HTTP client.

## Structure

| Directory | Role |
|---|---|
| `config-manager/` | Load/save config.json with Zod validation |
| `auth-manager/` | Credential storage, encryption, header injection |
| `environment-resolver/` | Cloud/Server detection, URL normalization |
| `http-client/` | Fetch wrapper with retry, SSRF guard, auth injection |

## Boundaries

### Always do

- Use Zod schemas from types/ for validation
- Export through barrel index.ts

### Ask first

- Add new core module

### Never do

- Import from mcp/ layer (unidirectional: mcp → core)
- Expose raw credentials outside auth-manager
