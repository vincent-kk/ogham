# Setup Flow Reference

## Normal Flow

1. Call MCP `setup` tool with `mode: "new"` (first setup) or `mode: "edit"` (reconfiguration)
2. The tool starts a local HTTP server on `127.0.0.1` and opens the browser automatically
3. The web UI handles: instance URL input, environment detection, auth method selection, credential collection, connection testing, and saving
4. Server auto-shuts down after successful save or 5 minutes of inactivity
5. Report the MCP tool result to the user

**Important**: Do NOT ask the user for URL, auth type, or credentials via chat. The web UI handles the entire setup flow.

## Arguments

- `--test`: Test existing connection status only (do not launch setup wizard)
- `--reset`: Clear existing configuration and start fresh (mode: `new`)

## Credentials Storage

On success, configuration is stored in `~/.claude/plugins/atlassian/`.
