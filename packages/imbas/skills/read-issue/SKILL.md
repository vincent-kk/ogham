---
name: imbas-read-issue
user_invocable: false
description: >
  Internal skill. Reads a Jira issue with its full comment thread, reconstructs
  the conversation context, and returns a structured JSON summary.
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# imbas-read-issue — Issue Context Reconstruction (Internal)

Internal skill that reads a Jira issue with its full comment thread, reconstructs
the conversation context (who said what, decisions made, latest state), and returns
a structured JSON summary. Called by validate, split, devplan, digest skills and
by imbas-analyst, imbas-planner, imbas-engineer agents.

## Arguments

```
imbas:read-issue <issue-key> [--no-cache] [--depth shallow|full]

<issue-key>  : Jira issue key (e.g., PROJ-123)
--no-cache   : Ignore cache, force re-query from Jira
--depth      : shallow = metadata + description only, full = include comments (default: full)
```

## Complete Workflow

```
Step 1 — Issue query
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

Step 2 — Digest comment Fast Path detection
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

Step 3 — Comment conversation reconstruction (Full Path)
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

Step 4 — Context synthesis
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

Step 5 — Structured output
  Build and return the complete JSON result (schema below).
  No caching — issue content changes frequently, so every call queries Jira directly.
```

## Output Schema

```json
{
  "key": "PROJ-123",
  "summary": "Social login for new user registration",
  "type": "Story",
  "status": "In Progress",
  "assignee": "Bob",
  "reporter": "Alice",
  "created": "2026-03-20",
  "updated": "2026-04-03",
  "description_excerpt": "As a new user, I want to sign up via social accounts...",
  "comment_count": 7,
  "participants": [
    { "name": "Alice", "role_hint": "PO", "comment_count": 3 },
    { "name": "Bob", "role_hint": "BE Developer", "comment_count": 2 },
    { "name": "Charlie", "role_hint": "QA", "comment_count": 2 }
  ],
  "decisions": [
    {
      "date": "2026-04-01",
      "by": "Alice",
      "content": "Limit OAuth scope to email+profile",
      "agreed_by": ["Bob"],
      "source_comment_index": 3
    }
  ],
  "open_questions": [
    {
      "date": "2026-04-03",
      "by": "Charlie",
      "content": "Apple OAuth has optional email — how to handle?",
      "status": "unanswered"
    }
  ],
  "latest_context": "Bob pointed out Apple OAuth has different scope restrictions on 4/3. Charlie raised QA concern. Unresolved.",
  "conversation_summary": "Alice(PO) proposed scope → Bob(BE) agreed → Charlie(QA) raised Apple edge case (unanswered)",
  "digest_found": true,
  "digest_covered_comments": "1-15",
  "new_comments_after_digest": 2
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Jira issue key |
| `summary` | string | Issue title |
| `type` | string | Issue type (Story, Task, Bug, etc.) |
| `status` | string | Current workflow status |
| `assignee` | string | Current assignee display name |
| `reporter` | string | Issue reporter display name |
| `created` | string | Issue creation date |
| `updated` | string | Last update date |
| `description_excerpt` | string | Truncated description (first meaningful paragraph) |
| `comment_count` | number | Total number of comments |
| `participants` | array | Unique commenters with role hints and counts |
| `decisions` | array | Extracted decisions with attribution and evidence |
| `open_questions` | array | Unresolved questions with status |
| `latest_context` | string | Natural language summary of the most recent state |
| `conversation_summary` | string | One-line conversation flow summary |
| `digest_found` | boolean | Whether an imbas:digest marker was found in comments |
| `digest_covered_comments` | string\|null | Range of comments covered by the digest (e.g., "1-15") |
| `new_comments_after_digest` | number | Count of comments after the digest coverage range |

## Caching Policy

- **Issue content is NOT cached** — comments change frequently, so every call queries Jira
- Digest comment Fast Path reduces processing cost without caching
  (covered comment range is skipped, only new comments are fully analyzed)
- Project metadata (issue types, link types) uses the separate `cache` skill

## Agent Usage Patterns

| Agent | When | Purpose |
|-------|------|---------|
| imbas-analyst | Phase 1 (validate) | Reference existing related issues for context |
| imbas-planner | Phase 2 (split) | Understand Epic or existing Story context |
| imbas-engineer | Phase 3 (devplan) | Check Story comments for additional implementation discussion |

## Tools Used

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getJiraIssue` | Query issue metadata, description, and comments |

## Agent Spawn

No agent spawn. This skill executes directly and returns structured data to the caller.

## Error Handling

| Error | Action |
|-------|--------|
| Issue not found | Return error: "Issue {key} not found in Jira" |
| Atlassian MCP not connected | Return error: "Atlassian MCP not available" |
| Malformed comment body | Log warning, skip malformed comment, continue processing |
| Digest marker parse failure | Log warning, fall back to Full Path (ignore malformed digest) |
