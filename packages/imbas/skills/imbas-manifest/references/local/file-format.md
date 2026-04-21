# Local Provider — Issue File Format

Transcribed from `.omc/plans/imbas-local-provider.md §3.4`. Single source of
truth; see also `SPEC-provider-local.md §3.4`.

## Full template (Story example)

```markdown
---
id: S-1
type: Story                     # Story | Task | Subtask
title: "사용자 로그인 플로우"
status: To Do                   # To Do | Ready for Dev | In Progress | In Review | Done
parent: null                    # Subtask only — parent Task/Story ID
epic: null                      # Story only — Epic identifier or null
links:
  - type: blocks                # blocks | is blocked by | is split into | split from | relates to
    to: S-5
verification:                    # Story only
  anchor_link: true
  coherence: PASS
  reverse_inference: PASS
size_check: PASS                # Story only
split_from: null                # Story only
split_into: []                  # Story only
created_at: 2026-04-06T12:34:56Z
run_id: 20260406-001
---

## Description

(StoryItem.description body content, verbatim from the manifest)

## Digest
<!-- initially empty. /imbas:imbas-digest appends to this section. -->
```

## Field rules

- `id` is a string matching `^(S|T|ST)-\d+$`.
- `type` is literal `Story`, `Task`, or `Subtask` (English anchors — parser-stable).
- `status` is one of `To Do`, `Ready for Dev`, `In Progress`, `In Review`, `Done`.
- `parent` is `null` for Story/Task; required for Subtask (points to parent `T-<N>` or `S-<N>`).
- `epic` is `null` or a string identifier, Story only.
- `links[]` is an array of `{type, to}` objects. See `link-handling.md` for bidirectional maintenance.
- `verification`, `size_check`, `split_from`, `split_into` are Story-only. Subtask files MUST omit these keys entirely (not set them to null).
- `created_at` is ISO 8601 UTC.
- `run_id` is the run identifier that created the file.

## Body sections

- `## Description` and `## Digest` are English literal section headings. Parsers rely on these as anchors. Do NOT translate them.
- Description body content follows `config.language.issue_content` (default `ko`).
- Digest section starts empty and is append-only (see `../workflow.md` Step 5
  `add_feedback_comments` and the `imbas-digest` skill).

## Omissions by type

| Field           | Story | Task | Subtask |
|-----------------|-------|------|---------|
| `parent`        | ✗ (null) | ✗ (null) | ✓ |
| `epic`          | ✓     | ✗    | ✗       |
| `verification`  | ✓     | ✗    | ✗       |
| `size_check`    | ✓     | ✗    | ✗       |
| `split_from`    | ✓     | ✗    | ✗       |
| `split_into`    | ✓     | ✗    | ✗       |
| `links[]`       | ✓     | ✓    | ✓ (usually empty) |

Omit means "do not include the key". Null means "include the key with null value".
