# digest Workflow — Provider-agnostic skeleton

This file owns Steps 1–5. Step 6 (preview / publish) is delegated to the
provider-specific workflow file selected by `config.provider`:

- `jira`  → `jira/workflow.md` Step 6
- `local` → `local/workflow.md` Step 6

## Step 0 — Provider routing

Read `config.provider` via `config_get`. Note the target workflow file for
Step 6, but do not read it yet.

## Step 1 — Read issue (full depth)

1. Call internal skill: `imbas:read-issue`(issue-ref, depth: full).
   The read-issue skill itself is provider-routed, so this delegation works
   uniformly regardless of `config.provider`.
2. Receive structured JSON with:
   - Issue metadata (summary, type, status, assignee, reporter)
   - Full comment thread (Jira) or empty comments + description + digest
     entries (local)
   - Participants with role hints (Jira) or empty (local)
   - Existing decisions and open questions
3. Detect attached media (images, videos, GIFs) in description or comments.
   - If media found AND `--no-media` flag NOT set AND provider is `jira` →
     call `/imbas:imbas-fetch-media` for each attachment.
   - Include visual analysis in digest context.
   - Local provider skips media auto-invocation in v1.

## Step 2 — State Tracking (timeline construction)

Read comments (Jira) or description + existing digest entries (local)
chronologically, recording state changes:

- t0: Issue creation — initial requirements from description.
  Record: original scope, constraints, acceptance criteria.
- t1..tN: Each comment or digest entry — detect state transitions:
  - Decision made (keywords: `확정`, `결정`, `합의`, `agreed`, `let's go with`)
  - New constraint discovered
  - Question raised
  - Question answered/resolved
  - Requirement changed
  - Alternative rejected

Result: ordered timeline of state changes with attribution (who/when/what).
In local mode, attribution is "system" since there are no comment authors.

## Step 3 — QA-Prompting (quality extraction)

Apply 6 structured questions:

- Q1: What decisions were made? → content, decision-maker, date, agreers
- Q2: Why were those decisions made? → link to evidence/reasoning
- Q3: What alternatives were rejected? → outcome + brief reason
- Q4: What technical constraints were discovered?
- Q5: Are there unresolved issues? → unanswered, in_discussion, blocked
- Q6: Who are the key participants and their roles? → role hints

In local mode, Q6 typically returns an empty list (no multi-participant
signal) — this is expected, not an error.

## Step 4 — 3-Layer Compression

- **Layer 3 (executive)**: 1-2 sentence final summary.
- **Layer 2 (structured)**: categorized extraction (decisions[], constraints[],
  rejected[], open_questions[]).
- **Layer 1 (excerpts)**: minimal original quotes that support key decisions.

## Step 5 — Formatting

Build the formatted digest body with sections: Summary, Decisions, Constraints,
Rejected, Open Questions, Participants.

The exact framing (marker comment for Jira vs timestamped `### {ISO}` entry for
local) is chosen by the provider branch in Step 6.

## Step 6 — Preview / Publish — provider-specific

Now load `jira/workflow.md` or `local/workflow.md` per `config.provider` and
execute its Step 6 exactly.
