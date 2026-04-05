---
version: 1.0
status: active
updated: 2026-04-06
---

# SPEC-provider-github — GitHub Provider Executor

## Purpose

Full specification for the `github` issue tracker provider. Stores
Story/Task/Subtask entities as GitHub issues in a single repository,
selected via `config.provider = "github"`. Runs entirely through the
`gh` CLI with ambient `gh auth` — no MCP server, no stored credentials.

## Design decisions (locked 2026-04-06)

All 9 decisions are frozen in
`.omc/specs/deep-interview-imbas-github-provider.md`. Summary:

| # | Topic | Decision |
|---|---|---|
| §1.1 | Sub-task model | Task-list checkboxes in parent body (`- [ ] #123`) |
| §1.2 | Link-type mapping | Body `## Links` section convention |
| §1.3 | `issue_ref` format | `owner/repo#123` fully qualified |
| §1.4 | Type differentiation | `type:*` labels (source of truth) + `[Story]` title prefix |
| §1.5 | Tool surface | `gh` CLI via Bash (no MCP) |
| §1.6 | Epic representation | Parent issue + task-list (symmetric with §1.1) |
| §1.7 | Status mapping | `status:*` labels + `gh issue close --reason` |
| §1.8 | Digest storage | `gh issue comment` + `<!-- imbas:digest -->` HTML marker |
| §1.9 | Metadata cache | Labels + milestones cache; `gh label create` bootstrap |

## Runtime dependencies

- `gh` CLI **>= 2.40** (required for `--reason` on `issue close`).
- Active `gh auth` session with `repo` scope. imbas never stores tokens.
- Bash permission in agent `tools:` frontmatter (already present; no baseline change).

## Tool surface

All interactions route through `gh` CLI subcommands invoked via Bash:

| Verb | Command template |
|---|---|
| Read issue | `gh issue view <n> --repo <owner/repo> --json state,labels,title,body,comments,createdAt` |
| Create issue | `gh issue create --repo <owner/repo> --title <t> --body <b> --label <type:*> --label <status:*>` |
| Update body | `gh api repos/<owner/repo>/issues/<n> --method PATCH -f body=<b>` |
| Add comment | `gh issue comment <n> --repo <owner/repo> --body-file -` |
| Edit last comment | `gh issue comment <n> --repo <owner/repo> --edit-last --body-file -` |
| Close (done) | `gh issue close <n> --repo <owner/repo> --reason completed` |
| Close (wont-do) | `gh issue close <n> --repo <owner/repo> --reason "not planned"` |
| Reopen | `gh issue reopen <n> --repo <owner/repo>` |
| List by label | `gh issue list --repo <owner/repo> --label type:story --state all --json number,title,labels` |
| Label bootstrap | `gh label create <name> --repo <owner/repo> --color <rrggbb>` |
| Label list | `gh label list --repo <owner/repo> --json name` |

No other subcommands are permitted from skill workflows. See
`skill-constraints-block.test.ts` `FORBIDDEN_BODY_TOKENS` for the
enforcement list.

## Type ontology (uniform issue + label model)

Every imbas entity is a single `gh issue`. Type differentiation is
hybrid per §1.4:

- **Labels (source of truth)**: `type:epic`, `type:story`, `type:task`, `type:subtask`
- **Title prefix (human readability)**: `[Epic] ...`, `[Story] ...`, `[Task] ...`, `[Subtask] ...`

Epic → Story → Task → Subtask is a uniform task-list hierarchy (§1.1,
§1.6). The parent issue body contains a task list referencing children.

## `issue_ref` format

Always fully qualified: `owner/repo#<number>` (§1.3). Example:
`ogham-org/ogham-app#42`. Stored verbatim in manifest
`issue_ref` strings. Display may shorten to `#42` when context is
unambiguous.

The manifest schema `StoryItemSchema.issue_ref: z.string().nullable()`
is unchanged — the format is a convention, not a schema constraint.

## Data contracts

### `## Links` section grammar (§1.2)

Parent issue body contains a literal `## Links` section at h2:

```markdown
## Links

- blocks: #123
- blocks: owner/repo#45
- blocked-by: #7
- split-from: #2
- split-into: #8, #9
- relates: #12, #14
```

Parser rules:

- Header: literal `## Links` (h2). Missing section → `{}`.
- Each item: `- <linkType>: <refList>`.
- `linkType` ∈ `{blocks, blocked-by, split-from, split-into, relates}`.
- `refList`: comma-separated list of `#N` or `owner/repo#N`.
- Empty section (header present, no items): `{}`.
- Duplicate `linkType` keys: merged (union of refs).
- Unknown `linkType`: parse warning (forward-compat), not error.

Parser implementation: `src/providers/github/parse-links.ts`.

### `<!-- imbas:digest -->` comment marker (§1.8)

`/imbas:digest` posts to GitHub via `gh issue comment` with a leading
HTML comment marker:

```markdown
<!-- imbas:digest -->
## Summary
...
```

**Collision policy: last-wins.** When multiple marked comments exist,
`read-issue` treats the comment with the most recent `created_at` as
canonical. `digest --update` PATCHes the last marked comment via
`gh issue comment --edit-last` (or resolved comment id).

### Status → label + close-reason mapping (§1.7)

| imbas status | GitHub state | Label |
|---|---|---|
| `todo` | `open` | `status:todo` |
| `ready-for-dev` | `open` | `status:ready-for-dev` |
| `in-progress` | `open` | `status:in-progress` |
| `in-review` | `open` | `status:in-review` |
| `done` | `closed` (reason: completed) | (none) |
| `wont-do` | `closed` (reason: not planned) | (none) |

Transition requires replacing the existing `status:*` label, and
optionally `gh issue close --reason <r>` for terminal states.

## Error policy

### Label bootstrap 403 (§1.9)

When `gh label create` fails with HTTP 403 / "resource not accessible":

**Policy: fail-fast.** The manifest skill MUST:

1. Emit a human-readable error: `"gh label create failed: insufficient scopes. Run 'gh auth refresh -s repo' and retry."`
2. Call `run_transition` to the `blocked` state.
3. NOT proceed with `gh issue create` (no degraded unlabeled creation).

No silent degradation. Aligns with the jira provider's fail-fast
semantics for missing custom fields.

### Other errors

| Condition | Taxonomy | Action |
|---|---|---|
| `gh issue view` returns 404 | `ISSUE_NOT_FOUND` | Abort; report to run state |
| `gh issue view` returns 410 (deleted) | `ISSUE_NOT_FOUND` | Same |
| `gh auth` missing | `AUTH_MISSING` | Abort; instruct user to run `gh auth login` |
| `gh` binary missing | `GH_CLI_MISSING` | Abort; instruct install |
| `gh api` rate limit exceeded | `RATE_LIMIT` | Abort with retry-after hint |
| Malformed `## Links` section | parse warning | Log, treat as `{}`, continue |

## Config keys

Added to `ImbasConfigSchema` as optional `github` field (only populated
when `provider === "github"`):

```typescript
export const GithubConfigSchema = z.object({
  repo: z.string(),  // "owner/name" — required when provider = github
  defaultLabels: z.array(z.string()).default([]),
  linkTypes: z
    .array(z.enum(['blocks', 'blocked-by', 'split-from', 'split-into', 'relates']))
    .default(['blocks', 'blocked-by', 'split-from', 'split-into', 'relates']),
});
```

Authentication uses ambient `gh auth` — no `token:` field in config.
The `repo` field is required at parse time only when
`config.provider === "github"`; otherwise it is ignored.

## Per-skill github branches

### manifest (github)

- `gh label list` → bootstrap missing `type:*` / `status:*` labels via
  `gh label create`. On 403 → fail-fast per above.
- Create parent Epic/Story issue; capture `owner/repo#N` from output.
- For each child (Story→Task, Task→Subtask): create child issue, then
  `gh api repos/<r>/issues/<parent>/ --method PATCH` updating the parent
  body to append `- [ ] <child_ref>` under the task list.
- Write bidirectional `## Links` section on both sides for
  `blocks` / `split-from` / etc.

### read-issue (github)

- `gh issue view <n> --json ...` → parse `body` for `## Links` + task-list.
- Scan `comments` for `<!-- imbas:digest -->` markers; return the
  **last** (most recent `created_at`) as the canonical digest.
- Return structured JSON matching the shared output schema.

### digest (github)

- `gh issue comment <n> --body-file -` with body starting with
  `<!-- imbas:digest -->\n...`.
- `/imbas:digest --update` uses `gh issue comment <n> --edit-last ...`
  (edits the most recent comment from the same author — the imbas
  marker guarantees it is the canonical digest).

### devplan (github)

- Same as manifest for Story→Subtask task-list maintenance.
- Does NOT create issues itself — emits devplan-manifest for the
  manifest skill to execute.

### status (github)

- `gh issue list --label status:ready-for-dev --state open --json ...`
  per status label to aggregate counts.
- No partition needed if divergence < 15 lines; currently inline.

### cache (github)

- `gh label list --repo <r>` → cache label inventory.
- No milestone caching in v1.2 (Epic = parent issue, not milestone).

## Migration

No automated migration from github to jira/local or vice versa in
v1.2. `gh issue transfer` exists but does not preserve imbas link
semantics. Future tooling may add export/reconcile operations. See
Follow-up notes in `.omc/plans/imbas-github-provider-v2.md` ADR.
