# read-issue Workflow — Provider-agnostic skeleton

This file defines the overall flow. Steps 1–4 are delegated to the
provider-specific workflow file (`jira/workflow.md`, `github/workflow.md`, or
`local/workflow.md`), selected by `config.provider`. Step 5 (structured output) is shared.

## Step 0 — Provider routing

Read `config.provider` via `mcp_tools_config_get`. Load ONLY the matching workflow:
- `jira`   → `jira/workflow.md`
- `github` → `github/workflow.md`
- `local`  → `local/workflow.md`

Do NOT read other provider files. See `SKILL.md` Constraints block.

## Steps 1-4 — Provider-specific

The loaded provider workflow handles:
1. Issue query / file lookup.
2. Digest fast-path detection or digest section parsing.
3. Conversation reconstruction (full in Jira, degraded in local).
4. Context synthesis (decisions, open questions, participants where available).

Each provider returns a result object with the same shape so Step 5 can build
the structured output identically.

## Step 5 — Structured output (shared)

Build and return the complete JSON result per `output-schema.md`.

Provider-specific notes:
- Jira: all fields populated; `participants`, `decisions`, `open_questions`
  fully analyzed from the comment thread.
- Local: `participants: []`; `decisions` / `open_questions` are scanned from
  description + digest bodies only; `comment_count` = digest entry count.

The `key` field holds the provider's native identifier:
- Jira: issue key (e.g., `PROJ-123`)
- Local: prefix-by-type ID (e.g., `S-1`, `T-3`, `ST-42`)

No caching. Issue content is re-read on every call.
