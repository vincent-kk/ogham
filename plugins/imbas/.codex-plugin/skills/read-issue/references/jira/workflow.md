# read-issue Workflow — Jira Provider

Loaded when `config.provider === 'jira'`. The shared skeleton
(`../workflow.md`) delegates Steps 1–4 to this file and owns Step 5
(structured output).

## Step 1 — Issue query

1. Call `[OP: get_issue] issue_ref=<issue-key>`.
2. Extract from response:
   - `key`, `summary`, `type`, `status`
   - `assignee`, `reporter`
   - `created`, `updated` timestamps
   - `description` (full body)
   - `comments` array (if present)
3. If `depth == "shallow"`:
   → Skip comment processing.
   → Build output with metadata + description only.
   → Jump to Step 5 in `../workflow.md`.

## Step 2 — Digest comment Fast Path detection

Scan comments for the imbas:digest marker:
```
<!-- imbas:digest v1 | generated: ... | comments_covered: 1-N -->
```

If digest marker found → Fast Path:
  a. Parse digest comment body:
     - Extract structured sections: decisions, constraints, rejected, open_questions
     - Extract participants and summary
  b. Read `comments_covered` range (e.g., "1-15")
  c. Count comments after the covered range (e.g., comment 16 onwards)
  d. If no new comments after digest:
     → Use digest content as the complete context
     → Set `digest_found: true`, `new_comments_after_digest: 0`
     → Jump to Step 5
  e. If new comments exist after digest:
     → Process only new comments through Step 3-4
     → Merge new analysis with digest content
     → Set `digest_found: true`, `new_comments_after_digest: <count>`

If no digest marker found → Full Path: proceed to Step 3.

## Step 3 — Comment conversation reconstruction

1. Sort comments chronologically by `created` timestamp.
2. For each comment, extract:
   - `author`: displayName of the comment author
   - `created`: timestamp (ISO 8601)
   - `body`: comment body text (markdown)
3. Analyze conversation flow patterns:
   - Question → Answer
   - Proposal → Agreement/Disagreement
   - `@mention`-based directed conversations
4. Build threaded conversation model from flat comment list.

## Step 4 — Context synthesis

1. Decision extraction (keyword scan in Korean/English): `확정`, `결정`, `합의`,
   `최종`, `agreed`, `decided`, `let's go with`, `confirmed`, `final`.
   Record per decision: date, by, content, agreed_by, source_comment_index.
2. Latest state determination: latest comment overrides description on conflict.
3. Open question detection: unanswered questions, `TBD`, `TODO`, `미정`, `추후 결정`.
4. Participant profiling: comment frequency + role inference (PO / Dev / QA / Designer).

Return structured result to the shared skeleton for Step 5 output.
