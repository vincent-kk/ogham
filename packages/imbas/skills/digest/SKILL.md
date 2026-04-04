---
name: imbas-digest
user_invocable: true
description: >
  Compresses a Jira issue's full context (description + comment thread + media)
  into a structured summary and posts it as a Jira comment. Uses State Tracking +
  QA-Prompting hybrid approach.
  Trigger: "digest issue", "이슈 정리", "티켓 요약", "imbas digest"
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# imbas-digest — Issue Context Compression

Compresses a Jira issue's full context (description, comment thread, and attached media)
into a structured summary and posts it as a Jira comment. Designed for ticket closing
or pre-analysis compression. Uses a State Tracking + QA-Prompting hybrid approach.

## When to Use This Skill

- Before closing a ticket with extensive discussion history
- When onboarding someone to a long-running issue
- When imbas:manifest transitions an issue to Done (suggestion trigger)
- Pre-processing an issue before imbas:validate or imbas:split references it

## Arguments

```
/imbas:digest <issue-key> [--preview]

<issue-key>  : Jira issue key (e.g., PROJ-123)
--preview    : Show digest without posting to Jira (dry run)
```

## Complete Workflow

```
Step 1 — Read issue (full depth)
  1. Call internal skill: read-issue(issue-key, depth: full)
  2. Receive structured JSON with:
     - Issue metadata (summary, type, status, assignee, reporter)
     - Full comment thread (authors, timestamps, bodies)
     - Participants with role hints
     - Existing decisions and open questions
  3. Detect attached media (images, videos, GIFs) in description or comments
     - If media found → call fetch-media for each attachment
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

## Digest Marker Specification

```
<!-- imbas:digest v{version} | generated: {ISO8601} | comments_covered: {start}-{end} -->
...digest content...
<!-- /imbas:digest -->
```

| Field | Description |
|-------|-------------|
| `v{version}` | Digest format version (currently `v1`) |
| `generated` | ISO 8601 timestamp of digest generation |
| `comments_covered` | Range of comment indices analyzed (e.g., `1-15`) |

The digest marker serves two purposes:
1. **Machine-readable** — read-issue skill detects this marker for Fast Path optimization
2. **Human-readable** — clearly marks AI-generated content with coverage scope

When re-running digest on the same issue:
- Detect existing digest comment via marker
- Only analyze comments after the covered range (e.g., comments 16+)
- Post a new digest comment (do not edit the old one)
- New digest references the full range (e.g., `comments_covered: 1-22`)

## Suggestion Trigger Logic

The digest skill is suggested (not auto-executed) when all conditions are met:

1. **Done transition**: imbas:manifest calls `transitionJiraIssue` to move an issue to Done status
2. **Comment threshold**: the issue has >= 3 comments
3. **Author threshold**: comments are from >= 2 distinct authors

When triggered, display:
```
This ticket has discussion history (N comments from M authors).
Run /imbas:digest {issue-key} to compress the context?
```

This is a suggestion only — never auto-execute digest.

## Cross-Issue Synthesis

Not supported in current scope. Digest operates on a single issue only.
Cross-issue context synthesis may be added as a separate skill in the future.

## Tools Used

### Atlassian MCP Tools (via internal skills)

| Tool | Usage | Via |
|------|-------|----|
| `getJiraIssue` | Read issue with full comment thread | read-issue skill |
| `addCommentToJiraIssue` | Post digest comment to Jira | direct call |
| `fetchAtlassian` | Download attached media files | fetch-media skill |

## Agent Spawn

No direct agent spawn. Digest uses internal skills:
- `read-issue` — for structured issue context
- `fetch-media` — for attached media analysis (when media is present)

## Error Handling

| Error | Action |
|-------|--------|
| Issue not found | Display: "Issue {key} not found. Verify the issue key." |
| No comments on issue | Display: "Issue {key} has no comments. Digest requires comment history." Proceed with description-only digest. |
| Atlassian MCP not connected | Display: "Atlassian MCP server is not available. Connect it first." |
| Comment post failure | Display error details. Offer to save digest as local file instead. |
| Media fetch failure | Log warning, continue digest without media context. |
