# read-issue Workflow — GitHub Provider

Loaded when `config.provider === 'github'`. The shared skeleton
(`../workflow.md`) delegates Steps 1–4 to this file and owns Step 5
(structured output).

## Step 1 — Issue query

1. Parse `issue_ref` into `owner/repo` and issue number `N`.
   Format: `owner/repo#N` (§1.3). Accept bare `#N` using `config.github.repo`.
2. ```bash
   gh issue view <N> --repo <owner/repo> \
     --json number,title,state,labels,body,comments,createdAt,updatedAt,author,assignees
   ```
3. Extract from JSON response:
   - `number`, `title` (strip `[Story]` / `[Task]` prefix for display)
   - `state` (`open` / `closed`)
   - `labels[*].name` → derive `type:*` and `status:*` values
   - `body` → parse `## Sub-tasks` task-list and `## Links` section
   - `comments` array
   - `createdAt`, `updatedAt`, `author.login`, `assignees[*].login`
4. If `depth == "shallow"`:
   → Skip comment processing.
   → Build output with metadata + description + links only.
   → Jump to Step 5 in `../workflow.md`.

## Step 2 — Digest comment fast path detection

**Last-wins policy**: when multiple `<!-- imbas:digest -->`-marked comments
exist on the same issue, treat the comment with the most recent `createdAt`
as canonical. All earlier marked comments are superseded.

Scan `comments` array for the `<!-- imbas:digest -->` HTML marker:

```
<!-- imbas:digest v1 | generated: ... | comments_covered: 1-N -->
```

If any digest-marked comment found:
1. Sort all marked comments by `createdAt` descending.
2. Take the **first** (most recent) as the canonical digest.
3. Parse its body:
   - Extract structured sections: decisions, constraints, rejected, open_questions
   - Extract participants and summary
   - Extract `comments_covered` range (e.g., `"1-15"`)
4. Count comments in the `comments` array after the covered range index.
5. If no new comments after digest:
   → Use digest content as the complete context.
   → Set `digest_found: true`, `new_comments_after_digest: 0`.
   → Jump to Step 5.
6. If new comments exist after digest:
   → Process only new comments through Steps 3–4.
   → Merge new analysis with digest content.
   → Set `digest_found: true`, `new_comments_after_digest: <count>`.

If no digest-marked comment found → Full Path: proceed to Step 3.

## Step 3 — Comment conversation reconstruction

1. Sort `comments` array chronologically by `createdAt`.
2. For each comment, extract:
   - `author.login`
   - `createdAt` (ISO 8601)
   - `body` (markdown text)
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

## Body parsing

During Step 1, parse the issue body for structured data:

### `## Sub-tasks` task-list

Extract lines matching `- [ ] #N` or `- [x] #N`. Build child ref list with
checked/unchecked state. Used to reconstruct the hierarchy.

### `## Links` section

Parse per the grammar in `manifest/references/github/link-handling.md`.
Returns a map of `linkType → [refList]`.
