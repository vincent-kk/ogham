# GitHub Issue Body Format — imbas-managed Issues

Documents the structure of GitHub issues created and maintained by imbas
when `config.provider === 'github'`. This is the GitHub analog of the local
provider's `file-format.md`.

## Issue anatomy

Every imbas-managed GitHub issue has three components:

1. **Title** — type-prefixed human-readable string (§1.4)
2. **Labels** — type classification + status + defaults (§1.4, §1.7, §1.9)
3. **Body** — structured markdown with fixed sections (§1.1, §1.2)

## Title format

```
[<Type>] <title text>
```

Where `<Type>` is one of: `Epic`, `Story`, `Task`, `Subtask`.

Examples:
```
[Story] User can reset their password
[Task] Implement JWT refresh token endpoint
[Subtask] Write unit tests for token expiry edge case
```

The `type:*` label is the authoritative type signal. The title prefix is
for human readability only and MUST match the label.

## Labels

Every imbas issue carries exactly:

- **One** `type:*` label: `type:epic`, `type:story`, `type:task`, or `type:subtask`
- **One** `status:*` label on open issues: `status:todo`, `status:ready-for-dev`,
  `status:in-progress`, `status:in-review` (terminal states use close reason instead)
- **Zero or more** labels from `config.github.defaultLabels`

### Status → GitHub state mapping (§1.7)

| imbas status | GitHub issue state | Label |
|---|---|---|
| `todo` | `open` | `status:todo` |
| `ready-for-dev` | `open` | `status:ready-for-dev` |
| `in-progress` | `open` | `status:in-progress` |
| `in-review` | `open` | `status:in-review` |
| `done` | `closed` (reason: completed) | (none) |
| `wont-do` | `closed` (reason: not planned) | (none) |

## Body sections

The body is structured markdown with fixed h2 sections in this order:

```markdown
## Description

<issue description text>

## Sub-tasks

- [ ] owner/repo#42
- [ ] owner/repo#43
- [x] owner/repo#41

## Links

- blocks: #7
- split-from: #2
```

### `## Description`

The issue's primary content. Free-form markdown. Written at creation time
from `manifest.stories[*].description` or `manifest.tasks[*].description`.
Not machine-parsed after creation (treated as opaque text).

### `## Sub-tasks`

Task-list checkboxes listing child issue refs (§1.1, §1.6).

- Present on: `type:epic` (lists stories), `type:story` (lists tasks),
  `type:task` (lists subtasks).
- Absent on: `type:subtask` (leaf node, no children).
- Format: `- [ ] #N` (unchecked) or `- [x] #N` (checked, i.e., closed).
- References use `#N` short form when in the same repo, `owner/repo#N` for cross-repo.
- Maintained by imbas `gh api PATCH` calls. Do NOT edit manually in workflow
  code — always read-then-write to avoid clobbering other edits.

### `## Links`

Relation links between issues (§1.2). Full grammar in `link-handling.md`.

- Present on all issue types (may be empty — header present, no items).
- Written and maintained by the manifest skill link creation step.
- Parsed by `imbas-read-issue` to build the structured link graph.

## Digest comments

Digest content is stored as GitHub issue **comments**, NOT in the body.
The comment body starts with the HTML marker `<!-- imbas:digest -->` (§1.8).
See `digest/references/github/workflow.md` for the digest comment format.
The body `## Links` and `## Sub-tasks` sections are never used for digest storage.

## Minimal initial body template

When creating an issue, the body MUST include all three section headers
even if `## Sub-tasks` and `## Links` are initially empty:

```markdown
## Description

<description>

## Sub-tasks

## Links
```

This ensures subsequent PATCH appends can locate the correct section
without having to insert new headers mid-body.
