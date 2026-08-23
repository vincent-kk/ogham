# Setup Flow Reference

## Normal Flow

1. Call MCP `mcp__plugin_atlassian_tools__setup` tool with `mode: "new"` (first setup) or `mode: "edit"` (reconfiguration)
2. The tool starts a local HTTP server on `127.0.0.1` and opens the browser automatically
3. The web UI handles: instance URL input, environment detection, auth method selection, credential collection, connection testing, and saving
4. Server auto-shuts down after successful save or 5 minutes of inactivity
5. The MCP call completes after a successful save or a terminal close/timeout.
   Report a successful result's `config_path` verbatim; a failed result has no
   saved path, so report only its message and never reconstruct a host path.

**Important**: Do NOT ask the user for URL, auth type, or credentials via chat. The web UI handles the entire setup flow.

## Arguments

- `--test`: Test existing connection status only (do not launch setup wizard)
- `--reset`: Clear existing configuration and start fresh (mode: `new`)

## Credentials Storage

On success, report: `Configuration stored in <config_path>.` The path is the
exact user/project scope selected in the browser and returned by the MCP tool.
