# devplan Workflow — Jira Provider

Loaded when `config.provider === 'jira'`. The shared skeleton (`../workflow.md`)
owns Steps 1, 2, 4. This file owns only the Jira-specific Step 3 semantics and
the final-message text.

## Step 3 — B→A Feedback Collection (Jira)

When Story definition ≠ code reality, record a feedback_comment:

```
target_story:  "<Story ID>"          # manifest-local ID
target_ref:    "<PROJ-KEY>"          # Jira issue key resolved from manifest.issue_ref
comment:       "<divergence description>"
type:          "mapping_divergence" | "story_split_issue"
```

These feedback_comments are later posted to Jira by the `imbas:imbas-manifest
devplan` skill via `[OP: add_comment]`. The `target_ref` MUST be the Jira
key (not a local path) so the manifest skill can dispatch directly.

**Principle**: "Problem space tree unchanged" — Stories themselves are NOT
modified. Divergences become Jira comments only.

Call `mcp_tools_manifest_save` to persist feedback_comments in devplan-manifest.json.

## Step 4 — Final user guidance (Jira)

After the shared workflow.md emits the terminal marker (Step 4 Option A Step 3),
display the next-step command:

> "Run /imbas:imbas-manifest devplan to create Jira issues."

## Delegated reads (optional)

During Step 2 exploration, the `engineer` agent MAY additionally use
Jira operations to enrich its understanding of existing Jira state:

- `[OP: get_issue]` — read latest Story state + comments
- `[OP: search_jql]` — find related existing issues for pattern matching

These are optional, not required. The core exploration (Step 2a-2e) relies on
`mcp_tools_ast_search`, `mcp_tools_ast_analyze`, `Read`, `Grep`, `Glob` which are provider-agnostic.
