# Tools Used — GitHub Provider (read-issue skill)

Loaded when `config.provider === 'github'`. Provider-agnostic imbas MCP tools
(`mcp_tools_run_get`, `mcp_tools_config_get`, `mcp_tools_cache_get`) are documented in `../tools.md` and are
used by all providers.

## gh CLI Subcommands

| Command | Purpose | Key output fields |
|---------|---------|------------------|
| `gh issue view <N> --repo <r> --json ...` | Fetch issue metadata, body, and comments | `number`, `title`, `state`, `labels`, `body`, `comments`, `createdAt`, `updatedAt`, `author`, `assignees` |

## Full command template

```bash
gh issue view <N> \
  --repo owner/repo \
  --json number,title,state,labels,body,comments,createdAt,updatedAt,author,assignees
```

### JSON output shape

```json
{
  "number": 42,
  "title": "[Story] My issue title",
  "state": "OPEN",
  "labels": [{"name": "type:story"}, {"name": "status:in-progress"}],
  "body": "## Description\n\n...\n\n## Sub-tasks\n\n## Links\n",
  "comments": [
    {
      "author": {"login": "alice"},
      "createdAt": "2026-04-06T10:00:00Z",
      "body": "<!-- imbas:digest v1 | generated: 2026-04-06T10:00:00Z | comments_covered: 1-5 -->\n..."
    }
  ],
  "createdAt": "2026-04-01T09:00:00Z",
  "updatedAt": "2026-04-06T10:00:00Z",
  "author": {"login": "bob"},
  "assignees": [{"login": "alice"}]
}
```

## Parsing helpers

No additional `gh` subcommands are used by read-issue. All parsing
(body sections, digest marker detection, comment reconstruction) is done
in-memory from the single `gh issue view` JSON response.

## Error modes

| Condition | Detection | Action |
|-----------|-----------|--------|
| Issue not found | Exit non-zero, stderr "404" or "Could not resolve" | `ISSUE_NOT_FOUND` — abort |
| Auth missing | Stderr "authentication required" | `AUTH_MISSING` — abort |
| `gh` binary missing | `which gh` fails | `GH_CLI_MISSING` — abort |
| Rate limit | Stderr "rate limit" | `RATE_LIMIT` — abort with hint |

See `errors.md` for full taxonomy.
