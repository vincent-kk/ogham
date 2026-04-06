# digest Workflow — Jira Provider

Loaded when `config.provider === 'jira'`. Steps 1–5 (read-issue delegation,
state tracking, QA prompting, 3-layer compression, comment formatting) live in
the shared `../workflow.md`. This file owns Step 6 (preview/publish) and the
digest marker protocol specific to Jira.

## Step 6 — Preview / Publish (Jira)

### `--preview` flag set
- Display formatted digest to user.
- Do NOT post to Jira.
- End.

### Default (no `--preview`)
1. Display formatted digest to user as preview.
2. Ask: "Post this digest as a comment to `{issue-key}`?"
3. If approved:
   - Call `[OP: add_comment] issue_ref=<issue-key>, body=<formatted_comment>`.
   - The comment body begins with the digest marker (see below).
4. If rejected: end without posting.

## Digest Marker Protocol (Jira-specific)

The posted comment is wrapped in machine-readable markers so `imbas-read-issue`
Fast Path and future `re-run` operations can detect prior digests:

```
<!-- imbas:digest v1 | generated: {ISO8601} | comments_covered: {start}-{end} -->
...digest content...
<!-- /imbas:imbas-digest -->
```

Field reference:
| Field | Description |
|-------|-------------|
| `v1` | Digest format version |
| `generated` | ISO 8601 timestamp of digest generation |
| `comments_covered` | Range of comment indices analyzed (e.g., `1-15`) |

## Re-run Behavior (Jira)

When re-running digest on the same issue:
- Detect existing digest comment via marker scan of the thread.
- Only analyze comments AFTER the covered range (e.g., comments 16+).
- Post a NEW digest comment (do not edit the old one — preserves history).
- New digest references the full range (e.g., `comments_covered: 1-22`).

## Suggestion Trigger (Jira)

The `imbas:digest` skill is suggested (never auto-executed) when ALL of:

1. `imbas:manifest` calls `[OP: transition_issue]` to move an issue to Done.
2. The issue has ≥ 3 comments.
3. Comments are from ≥ 2 distinct authors.

When triggered, display:
```
This ticket has discussion history (N comments from M authors).
Run /imbas:imbas-digest {issue-key} to compress the context?
```

Suggestion only — never auto-execute.
