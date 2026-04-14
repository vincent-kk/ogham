# Tools Used — GitHub Provider (digest skill)

Loaded when `config.provider === 'github'`. Provider-agnostic imbas MCP tools
(`mcp_tools_run_get`, `mcp_tools_config_get`) are documented in `../tools.md` and are used by all
providers. Issue reading is delegated to the `imbas-read-issue` skill (see Step 1 of
`../workflow.md`).

## gh CLI Subcommands

| Command | Purpose | Key output fields |
|---------|---------|------------------|
| `gh issue comment <N> --repo <r> --body-file -` | Post new digest comment to issue | exit code (0 = success) |
| `gh issue comment <N> --repo <r> --edit-last --body-file -` | Update (PATCH) most recent comment | exit code |
| `gh api repos/<r>/issues/comments/<id> --method PATCH -f body=<b>` | PATCH a specific comment by id | `{id, body}` |

## Command templates

### Post new digest comment

```bash
cat <<'EOF' | gh issue comment 42 --repo owner/repo --body-file -
<!-- imbas:digest v1 | generated: 2026-04-06T10:00:00Z | comments_covered: 1-15 -->
## Summary

...digest content...

<!-- /imbas:imbas-digest -->
EOF
```

### Update most recent comment (`--update` flag)

```bash
cat <<'EOF' | gh issue comment 42 --repo owner/repo --edit-last --body-file -
<!-- imbas:digest v1 | generated: 2026-04-06T11:00:00Z | comments_covered: 1-22 -->
## Summary

...updated digest...

<!-- /imbas:imbas-digest -->
EOF
```

### PATCH by comment id (alternative)

```bash
gh api repos/owner/repo/issues/comments/9876 \
  --method PATCH \
  -f body="<!-- imbas:digest v1 | ... -->..."
```

The comment id is obtained from the `imbas-read-issue` response (`comments[*].databaseId`
or parsed from the `gh issue view --json comments` output).

## Error modes

| Condition | Detection | Action |
|-----------|-----------|--------|
| Issue not found | Exit non-zero + stderr "404" | `ISSUE_NOT_FOUND` — abort |
| Auth missing | Stderr "authentication required" | `AUTH_MISSING` — abort |
| `gh` binary missing | `which gh` fails | `GH_CLI_MISSING` — abort |
| `--edit-last` with no prior comment | Stderr "no comments" | Fall back to posting new comment |
| Rate limit | Stderr "rate limit" | `RATE_LIMIT` — abort with hint |

See `errors.md` for full taxonomy.
