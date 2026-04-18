# digest Workflow — Local Provider

Loaded when `config.provider === 'local'`. Steps 1–5 (read-issue delegation,
state tracking, QA prompting, 3-layer compression, comment formatting) live in
the shared `../workflow.md`. This file owns Step 6 (preview/publish) and the
append protocol for the local `## Digest` section.

## Degraded input

Local issues do not have a multi-participant comment thread. `imbas:imbas-read-issue`
in local mode returns a degraded conversation model with `participants: []`.
Steps 2–4 in the shared workflow still run but produce simpler output:
- Decisions / open questions are extracted from description + prior digest
  entries only.
- The QA-prompting pass (Q1-Q6) may return empty sections (e.g. Q6 Participants).
- 3-layer compression still produces Layer 3 summary, Layer 2 structured
  extraction, and Layer 1 excerpts.

## Step 6 — Preview / Publish (Local)

### `--preview` flag set
- Display formatted digest to user.
- Do NOT write to the file.
- End.

### Default (no `--preview`)
1. Display formatted digest to user as preview.
2. Ask: "Append this digest to `{local-id}.md`?"
3. If approved:
   - Resolve file path from the ID prefix (`S-` → stories, `T-` → tasks,
     `ST-` → subtasks).
   - `Read` the file to locate the `## Digest` section.
   - `Edit` to append a new entry (see Append Protocol below). **Never
     replace** the section — always append.
4. If rejected: end without writing.

## Append Protocol

The `## Digest` section is append-only. Each append is a new subsection
headed by an ISO 8601 timestamp:

```markdown
## Digest

### 2026-04-06T12:34:56Z
{Layer 3 executive summary}

**Decisions**
- {decision} (by {who}, {date})

**Constraints**
- {constraint}

**Rejected**
- {alternative} — {reason}

**Open Questions**
- {question} — {status}

### 2026-04-07T09:00:00Z
{next digest append...}
```

Subheadings inside each entry use bold labels (`**Decisions**`, etc.) rather
than `### Decisions`, to avoid polluting the markdown heading hierarchy.

## Re-run Behavior (Local)

When re-running digest on the same local file:
- `Read` the file's `## Digest` section to get the full content.
- Parse existing entries (`### {timestamp}` subsections).
- The newest entry IS the prior coverage — local does not track a
  `comments_covered` range because there are no comments.
- Steps 2–4 synthesize from description + all existing digest bodies.
- The new Step 6 append adds a new `### {timestamp}` entry. Prior entries
  are never modified or removed.

No marker comment is used in local mode. The section-plus-timestamp structure
is the machine-readable boundary.

## Suggestion Trigger (Local)

Local mode has no `[OP: transition_issue]` equivalent to trigger suggestions on.
In v1, `imbas:imbas-digest` for local is always invoked manually by the user. Future
work may add a trigger when a local issue's `imbas-status` frontmatter field
transitions to `Done`.
