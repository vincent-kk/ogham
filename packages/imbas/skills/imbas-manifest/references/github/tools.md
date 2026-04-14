# Tools Used — GitHub Provider (manifest skill)

Loaded when `config.provider === 'github'`. Provider-agnostic imbas MCP tools
(`mcp_tools_run_get`, `mcp_tools_manifest_get`, `mcp_tools_manifest_save`, `mcp_tools_manifest_plan`) are documented in
`../tools.md` and are used by all providers.

## gh CLI Subcommands

All tracker interaction routes through `gh` CLI invoked via Bash. No Atlassian
MCP tools, no direct GitHub REST API calls outside `gh api`.

| Command | Purpose | Key output fields |
|---------|---------|------------------|
| `gh label list --repo <r> --json name` | List existing labels for bootstrap diff | `[{name}]` |
| `gh label create <name> --repo <r> --color <rrggbb>` | Create missing `type:*` / `status:*` labels | exit code (0 = success, non-zero = error) |
| `gh issue create --repo <r> --title <t> --body <b> --label <l>...` | Create Epic/Story/Task/Subtask issue | printed URL (parse `#N` from it) |
| `gh issue view <N> --repo <r> --json state,labels,title` | Drift check: verify remote state | `{state, labels:[{name}], title}` |
| `gh api repos/<r>/issues/<N> --method PATCH -f body=<b>` | Update issue body (task-list + Links section) | `{number, body}` |
| `gh issue comment <N> --repo <r> --body-file -` | Post feedback comment to issue | exit code |

## Command templates

### Create issue

```bash
gh issue create \
  --repo owner/repo \
  --title "[Story] My title" \
  --body "$(cat <<'EOF'
## Description

<description text>

## Sub-tasks

## Links
EOF
)" \
  --label type:story \
  --label status:todo
```

Output line: `https://github.com/owner/repo/issues/42`
Parse number: `sed 's|.*/||'` → `42`
Build `issue_ref`: `owner/repo#42`

### PATCH body (append to task-list)

```bash
gh api repos/owner/repo/issues/42 \
  --method PATCH \
  -f body="<updated body string>"
```

The full updated body is computed by reading the current body (`gh issue view`),
appending the new `- [ ] #child` line under `## Sub-tasks`, then writing back.

### Label bootstrap

```bash
gh label list --repo owner/repo --json name | jq -r '.[].name'
gh label create "type:story" --repo owner/repo --color 0075ca
```

## Error modes

| Command | Non-zero exit | Meaning |
|---------|--------------|---------|
| `gh label create` | 403 / "resource not accessible" | Insufficient scopes → fail-fast |
| `gh issue create` | "not found" | Repo not found or auth missing |
| `gh issue view` | 404 | Issue deleted or wrong number |
| `gh api ... PATCH` | 422 | Body too large or malformed JSON |

See `errors.md` for full taxonomy and remediation.
