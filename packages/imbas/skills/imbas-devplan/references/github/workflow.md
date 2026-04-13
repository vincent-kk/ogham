# devplan Workflow — GitHub Provider

Loaded when `config.provider === 'github'`. The shared skeleton (`../workflow.md`)
owns Steps 1, 2, 4. This file owns only the GitHub-specific Step 3 semantics and
the final-message text.

## Step 3 — B→A Feedback Collection (GitHub)

When Story definition ≠ code reality, record a feedback_comment:

```
target_story:  "<Story ID>"          # manifest-local ID
target_ref:    "owner/repo#<N>"      # fully qualified GitHub issue ref (§1.3)
comment:       "<divergence description>"
type:          "mapping_divergence" | "story_split_issue"
```

These feedback_comments are later posted to GitHub by the `imbas:manifest
devplan` skill via `gh issue comment`. The `target_ref` MUST be the fully
qualified `owner/repo#N` format so the manifest skill can dispatch directly
without re-resolving the repo.

**Principle**: "Problem space tree unchanged" — Stories themselves are NOT
modified. Divergences become GitHub issue comments only, mirroring the
Jira-side "comments only" invariant.

Call `manifest_save` to persist feedback_comments in devplan-manifest.json.

## Step 4 — Final user guidance (GitHub)

When the user approves the devplan manifest, display:

> "Phase 3 complete. Run /imbas:imbas-manifest devplan to create GitHub issues in `<owner/repo>`."

## Delegated reads (optional)

During Step 2 exploration, the `engineer` agent MAY additionally query
existing GitHub issues to enrich its understanding of current state:

```bash
gh issue list --repo owner/repo --label type:story --state all \
  --json number,title,labels,state
```

```bash
gh issue view <N> --repo owner/repo --json title,body,labels,state
```

These are optional, not required. The core exploration (Step 2a–2e) relies on
`ast_search`, `ast_analyze`, `Read`, `Grep`, `Glob` which are provider-agnostic.
GitHub queries are supplemental context only.
