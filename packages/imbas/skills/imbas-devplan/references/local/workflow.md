# devplan Workflow — Local Provider

Loaded when `config.provider === 'local'`. The shared skeleton (`../workflow.md`)
owns Steps 1, 2, 4. This file owns only the local-specific Step 3 semantics and
the final-message text.

## Step 3 — B→A Feedback Collection (Local)

When Story definition ≠ code reality, record a feedback_comment:

```
target_story:  "<Story ID>"          # manifest-local ID
target_ref:    "S-<N>"               # local issue ID, same prefix-by-type format
comment:       "<divergence description>"
type:          "mapping_divergence" | "story_split_issue"
```

These feedback_comments are later appended by the `imbas:manifest devplan`
skill to the target local issue file's `## Digest` section via `Edit`
(see `skills/imbas-manifest/references/local/workflow.md` Step 5 — add_feedback_comments).

**Principle**: "Problem space tree unchanged" — Stories themselves are NOT
modified. Divergences become `## Digest` appends in the local file, mirroring
the Jira-side "comments only" invariant.

Call `manifest_save` to persist feedback_comments in devplan-manifest.json.

## Step 4 — Final user guidance (Local)

When the user approves the devplan manifest, display:

> "Phase 3 complete. Run /imbas:imbas-manifest devplan to create local issue files under .imbas/<KEY>/issues/."

## Delegated reads

During Step 2 exploration, the imbas-engineer agent does NOT query external
trackers. Local Stories are read directly from their markdown files via the
`imbas:read-issue` skill's local branch (Glob + Read + frontmatter parse).
