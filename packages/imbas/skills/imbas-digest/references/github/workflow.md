# digest Workflow — GitHub Provider

Loaded when `config.provider === 'github'`. Steps 1–5 (read-issue delegation,
state tracking, QA prompting, 3-layer compression, comment formatting) live in
the shared `../workflow.md`. This file owns Step 6 (preview/publish) and the
digest marker protocol specific to GitHub.

## Step 6 — Preview / Publish (GitHub)

### `--preview` flag set
- Display formatted digest to user.
- Do NOT post to GitHub.
- End.

### Default (no `--preview`)
1. Display formatted digest to user as preview.
2. Ask: "Post this digest as a comment to `<owner/repo#N>`?"
3. If approved:
   - Build comment body starting with the digest marker (see below).
   - ```bash
     echo "<comment body>" | gh issue comment <N> --repo <owner/repo> --body-file -
     ```
4. If rejected: end without posting.

## Digest Marker Protocol (GitHub-specific)

The posted comment is wrapped in machine-readable markers so `imbas-read-issue`
fast path and `digest --update` can detect prior digests:

```markdown
<!-- imbas:digest v1 | generated: {ISO8601} | comments_covered: {start}-{end} -->
## Summary
...
<!-- /imbas:imbas-digest -->
```

Field reference:
| Field | Description |
|-------|-------------|
| `v1` | Digest format version |
| `generated` | ISO 8601 timestamp of digest generation |
| `comments_covered` | Range of comment indices analyzed (e.g., `1-15`) |

## Re-run Behavior — Last-Wins Policy (GitHub)

**Policy: last-wins.** When re-running `imbas-digest` on the same issue:
- `imbas-read-issue` detects existing digest comment via `<!-- imbas:digest -->` marker scan.
- If multiple marked comments exist, the most recent `createdAt` is canonical.
- Only analyze comments AFTER the covered range (e.g., comments 16+).
- Use `digest --update` to PATCH the most recent marked comment:
  ```bash
  gh issue comment <N> --repo <owner/repo> --edit-last --body-file -
  ```
  (`--edit-last` edits the most recent comment from the authenticated user —
  the imbas marker guarantees it is the canonical digest comment.)
- Alternatively, resolve the comment id from the `imbas-read-issue` response and use:
  ```bash
  gh api repos/<owner/repo>/issues/comments/<comment_id> --method PATCH -f body=<b>
  ```
- Default (no `--update`): post a NEW digest comment (do not edit the old one).
  New digest covers the full range (e.g., `comments_covered: 1-22`).

## Suggestion Trigger (GitHub)

The `imbas:imbas-digest` skill is suggested (never auto-executed) when ALL of:

1. `imbas:imbas-manifest` closes an issue via `gh issue close --reason completed`.
2. The issue has ≥ 3 comments.
3. Comments are from ≥ 2 distinct `author.login` values.

When triggered, display:
```
This issue has discussion history (N comments from M authors).
Run /imbas:imbas-digest <owner/repo#N> to compress the context?
```

Suggestion only — never auto-execute.
