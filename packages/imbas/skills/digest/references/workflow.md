# digest — Complete Workflow

```
Step 1 — Read issue (full depth)
  1. Call internal skill: `imbas:read-issue`(issue-key, depth: full)
  2. Receive structured JSON with:
     - Issue metadata (summary, type, status, assignee, reporter)
     - Full comment thread (authors, timestamps, bodies)
     - Participants with role hints
     - Existing decisions and open questions
  3. Detect attached media (images, videos, GIFs) in description or comments
     - If media found → call `imbas:fetch-media` for each attachment
     - Include visual analysis in digest context

Step 2 — State Tracking (timeline construction)
  Read comments chronologically, recording state changes:

  - t0: Issue creation — initial requirements from description
    Record: original scope, constraints, acceptance criteria
  - t1..tN: Each comment — detect state transitions:
    - Decision made (keywords: "확정", "결정", "합의", "agreed", "let's go with")
    - New constraint discovered
    - Question raised
    - Question answered/resolved
    - Requirement changed
    - Alternative rejected

  Result: ordered timeline of state changes with attribution (who, when, what)

Step 3 — QA-Prompting (quality extraction)
  Apply 6 structured questions to extract and verify digest quality:

  Q1: What decisions were made?
      → Extract each decision with: content, decision-maker, date, agreers

  Q2: Why were those decisions made? (rationale)
      → Link each decision to its supporting evidence/reasoning

  Q3: What alternatives were rejected? (outcome + reason only)
      → Record rejected option + brief rejection reason
      → Do NOT include full deliberation, only conclusion

  Q4: What technical constraints were discovered?
      → Extract constraints that affect implementation

  Q5: Are there unresolved issues?
      → Detect unanswered questions, unresolved disagreements
      → Mark status: unanswered, in_discussion, blocked

  Q6: Who are the key participants and their roles?
      → Map participants to roles based on comment patterns
      → Summarize each participant's key contributions

Step 4 — 3-Layer compression
  Layer 3 (executive): 1-2 sentence final summary
    → Captures the essence of the entire issue in minimal text
    → Suitable for scanning in a list view

  Layer 2 (structured): categorized extraction
    → decisions[]: each with content, by, date, agreed_by
    → constraints[]: technical/business constraints discovered
    → rejected[]: alternatives considered and rejected with reasons
    → open_questions[]: unresolved items with status

  Layer 1 (excerpts): source evidence
    → Minimal original quotes that support key decisions
    → Only include when the original wording is critical
    → Reference comment index for traceability

Step 5 — Comment formatting
  Generate a markdown comment with digest marker:

  <!-- imbas:digest v1 | generated: {ISO8601 timestamp} | comments_covered: 1-{N} -->
  ## imbas Digest

  ### Summary
  {Layer 3 executive summary}

  ### Decisions
  - {decision content} (by {who}, {date}, agreed: {others})
  - ...

  ### Constraints
  - {constraint description}
  - ...

  ### Rejected
  - {alternative} rejected. Reason: {reason}
  - ...

  ### Open Questions
  - {question} (by {who}, {date}) — {status: unanswered|in_discussion|blocked}
  - ...

  ### Participants
  - {name} ({role_hint}): {contribution summary}
  - ...
  <!-- /imbas:digest -->

Step 6 — Preview/Publish flow
  - If --preview flag:
    → Display formatted digest to user
    → Do NOT post to Jira
    → End

  - Default (no --preview):
    → Display formatted digest to user as preview
    → Ask: "Post this digest as a comment to {issue-key}?"
    → If approved: call addCommentToJiraIssue(issue-key, formatted_comment)
    → If rejected: end without posting
```
