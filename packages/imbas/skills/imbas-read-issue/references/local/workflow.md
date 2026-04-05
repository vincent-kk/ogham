# read-issue Workflow — Local Provider

Loaded when `config.provider === 'local'`. The shared skeleton
(`../workflow.md`) delegates Steps 1–4 to this file and owns Step 5
(structured output).

## Step 1 — File lookup

Input: an issue ID string like `S-1`, `T-3`, or `ST-42`.

1. Resolve the type directory from the ID prefix:
   - `S-*` → `stories`
   - `T-*` → `tasks`
   - `ST-*` → `subtasks`
2. Compute the full path:
   ```
   .imbas/<PROJECT-KEY>/issues/<type>/<ID>.md
   ```
   where `<PROJECT-KEY>` is `config.defaults.project_ref` (fallback `LOCAL`).
3. `Glob` the path to verify existence. If missing → raise `ISSUE_NOT_FOUND`.
4. `Read` the file.
5. Parse the YAML frontmatter (between the `---` delimiters) into a metadata
   object. Parse body sections `## Description` and `## Digest` independently.

Extract from frontmatter:
- `id`, `type`, `title`, `imbas-status`
- `parent`, `epic`
- `links[]`
- `verification`, `size_check`, `split_from`, `split_into` (Story only)
- `created_at`, `run_id`

Extract from body:
- `## Description` → full description text
- `## Digest` → digest entries (may be empty)

If `depth == "shallow"`:
  → Skip digest processing.
  → Build output with metadata + description only.
  → Jump to Step 5 in `../workflow.md`.

## Step 2 — Digest section parsing

Unlike Jira (which scans comments for an `imbas:digest` marker), local issues
store digest content directly in the `## Digest` section of the file. The
section is append-only:

```markdown
## Digest

### 2026-04-06T09:12:00Z
(first digest append)

### 2026-04-06T14:35:00Z
(second digest append)
```

1. Split the `## Digest` section body by `^### ` headings to get individual
   digest entries.
2. For each entry: parse the ISO timestamp and the body text.
3. Chronological order follows file position (append-only semantics).

If the section is empty or missing:
- `digest_found = false`
- `digest_covered_comments = null`
- `new_comments_after_digest = 0`
- Proceed to Step 3 on `## Description` only.

If entries exist:
- `digest_found = true`
- `digest_covered_comments = "local:<N entries>"` (local does not use a
  comment-range string since there are no comments)
- `new_comments_after_digest = 0` (local digest is always "fully covered")

## Step 3 — Conversation reconstruction (degraded)

Local files do not have a multi-participant comment thread the way Jira does.
The conversation model degrades to:

- **Description** = initial authoring by the run that created the file.
- **Digest entries** = subsequent appends (each is a single body block).
- **Participants** = empty array (or populated from frontmatter `run_id` if
  that convention is ever introduced).
- **Comment count** = number of digest entries.

Return a flat, minimally-structured model to Step 4.

## Step 4 — Context synthesis (degraded)

1. Decision extraction: scan description + digest bodies for the same keyword
   set used in Jira (`확정`, `결정`, `agreed`, `decided`, etc.). Record
   decisions without `agreed_by` (no multi-participant signal available).
2. Latest state: the newest digest entry's body, if any; otherwise description.
3. Open questions: scan for `TBD`, `TODO`, `미정`, `추후 결정` markers.
4. Participant profiling: skipped — local files do not carry participant data.

Return the structured result to the shared skeleton for Step 5 output. In the
output object:
- `assignee` and `reporter` map from frontmatter if present; otherwise `null`.
- `participants: []`.
- `conversation_summary` becomes a one-line description of digest append count.
