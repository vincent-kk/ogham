# Tools Used — GitHub Provider (devplan skill)

Loaded when `config.provider === 'github'`. Provider-agnostic imbas MCP tools
(`mcp_tools_run_get`, `mcp_tools_manifest_get`, `mcp_tools_manifest_save`, `mcp_tools_manifest_plan`) are documented in
`../tools.md` and are used by all providers.

## gh CLI Subcommands

The devplan skill does NOT create GitHub issues itself. It emits a
`devplan-manifest.json` that the `imbas:imbas-manifest devplan` skill executes.
The GitHub queries listed here are **optional** supplemental reads during
Step 2 exploration.

| Command | Purpose | Key output fields |
|---------|---------|------------------|
| `gh issue list --repo <r> --label type:story --state all --json ...` | List existing Story issues for pattern matching | `[{number, title, labels, state}]` |
| `gh issue view <N> --repo <r> --json title,body,labels,state` | Read latest Story state for divergence context | `{title, body, labels, state}` |

## Command templates

### List stories (optional, Step 2 exploration)

```bash
gh issue list \
  --repo owner/repo \
  --label type:story \
  --state all \
  --json number,title,labels,state
```

### Read single story (optional)

```bash
gh issue view 42 \
  --repo owner/repo \
  --json title,body,labels,state
```

## devplan manifest output

The primary output of the devplan skill is a `devplan-manifest.json` containing
`feedback_comments` with `target_ref: "owner/repo#N"`. These are consumed by
`imbas:imbas-manifest devplan` which calls `gh issue comment` for each entry.

See `manifest/references/github/workflow.md` Step 5 for the execution protocol.

## Error modes

| Condition | Detection | Action |
|-----------|-----------|--------|
| `gh` binary missing | `which gh` fails | `GH_CLI_MISSING` — skip optional reads, continue with code exploration |
| Auth missing | Stderr "authentication required" | `AUTH_MISSING` — skip optional reads, warn user |
| Repo not found | Stderr "Could not resolve to a Repository" | Log warning; skip optional reads |

Optional GitHub reads in Step 2 are non-blocking — if they fail, the devplan
skill continues with code-only exploration.
