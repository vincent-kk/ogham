# Output Schema

## JSON Example

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

## Field Reference

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
