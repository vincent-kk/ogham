## Purpose

3 MCP tool handlers: fetch (HTTP GET/POST/PUT/PATCH/DELETE), convert (local format), setup (auth config).

## Boundaries

### Always do

- HTTP tools delegate to http-client for transport
- Return standard McpResponse envelope from HTTP tools

### Ask first

- Add new tool

### Never do

- Embed Jira/Confluence domain knowledge in tool handlers
