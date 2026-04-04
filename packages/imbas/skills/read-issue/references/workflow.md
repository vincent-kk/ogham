# Complete Workflow

## Step 1 — Issue query

1. Call Atlassian MCP: getJiraIssue(issueIdOrKey: <issue-key>)
2. Extract from response:
   - key, summary, type, status
   - assignee, reporter
   - created, updated timestamps
   - description (full body)
   - comments array (if present)
3. If depth == "shallow":
   → Skip comment processing
   → Build output with metadata + description only
   → Jump to Step 5

## Step 2 — Digest comment Fast Path detection

Scan comments for imbas:digest marker:
  <!-- imbas:digest v1 | generated: ... | comments_covered: 1-N -->

If digest marker found → Fast Path:
  a. Parse digest comment body:
     - Extract structured sections: decisions, constraints, rejected, open_questions
     - Extract participants and summary
  b. Read comments_covered range (e.g., "1-15")
  c. Count comments after the covered range (e.g., comment 16 onwards)
  d. If no new comments after digest:
     → Use digest content as the complete context
     → Set digest_found: true, new_comments_after_digest: 0
     → Jump to Step 5
  e. If new comments exist after digest:
     → Process only new comments through Step 3-4
     → Merge new analysis with digest content
     → Set digest_found: true, new_comments_after_digest: <count>

If no digest marker found → Full Path: proceed to Step 3

## Step 3 — Comment conversation reconstruction (Full Path)

1. Sort comments chronologically by created timestamp
2. For each comment, extract:
   - author: displayName of the comment author
   - created: timestamp (ISO 8601)
   - body: comment body text (markdown)
3. Analyze conversation flow patterns:
   - Question → Answer: detect interrogative patterns followed by responses
   - Proposal → Agreement/Disagreement: detect suggestions and reactions
   - @mention-based: identify directed conversations between participants
4. Build threaded conversation model from flat comment list

## Step 4 — Context synthesis

1. Decision extraction:
   - Scan for decision signal keywords:
     Korean: "확정", "결정", "합의", "최종", "으로 하자", "으로 갑시다"
     English: "agreed", "decided", "let's go with", "confirmed", "final"
   - For each decision, record:
     - date: when the decision was made
     - by: who made/proposed it
     - content: what was decided
     - agreed_by: who explicitly agreed (from subsequent comments)
     - source_comment_index: comment position for traceability

2. Latest state determination:
   - When description and comments conflict → latest comment takes precedence
   - Detect superseded requirements (older statements overridden by newer ones)

3. Open question detection:
   - Questions with no subsequent answer
   - Opposing opinions with no resolution
   - Explicit "TBD", "TODO", "미정", "추후 결정" markers

4. Participant profiling:
   - Comment frequency analysis per author
   - Role inference based on comment patterns:
     - Frequent requirement statements → PO/PM
     - Technical implementation details → Developer
     - Test scenarios, edge cases → QA
     - Visual/interaction feedback → Designer
   - Record: name, role_hint, comment_count

## Step 5 — Structured output

Build and return the complete JSON result (schema in output-schema.md).
No caching — issue content changes frequently, so every call queries Jira directly.
