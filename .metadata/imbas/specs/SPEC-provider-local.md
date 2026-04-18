# SPEC-provider-local — Local Provider Executor

> Status: Draft v1.0 (2026-04-06)
> Parent: [SPEC-provider.md](./SPEC-provider.md)

---

## 1. Overview

The `local` provider stores imbas-managed issues as markdown files under
`.imbas/<PROJECT-KEY>/issues/`. It is selected via `config.provider = "local"`
and performs no remote API calls.

## 2. Storage Layout

```text
.imbas/<PROJECT-KEY>/
├── issues/
│   ├── stories/   # S-<N>.md
│   ├── tasks/     # T-<N>.md
│   └── subtasks/  # ST-<N>.md
└── runs/<run-id>/
    ├── stories-manifest.json
    └── devplan-manifest.json
```

`<PROJECT-KEY>` comes from `config.defaults.project_ref`. If unset, local mode
falls back to `LOCAL`.

## 3. Identifier Rules

- Story: `S-<N>`
- Task: `T-<N>`
- Subtask: `ST-<N>`

The manifest stores the ID string only:

- `"S-42"`: valid `issue_ref`
- `".imbas/PROJ/issues/stories/S-42.md"`: invalid

The file path is always derived from the ID prefix at read time.

## 4. Execution Model

During `imbas:imbas-manifest` execution in local mode:

1. Determine the target directory from the item type.
2. `Glob` existing files in that directory.
3. Allocate the next numeric suffix for the relevant prefix.
4. Write the markdown file immediately.
5. Save the manifest immediately with the new `issue_ref`.

This allocate-then-write loop is per-item, not batch allocation, so reruns stay
crash-safe and idempotent.

## 5. File Format

Each local issue file contains YAML frontmatter plus fixed body anchors:

```markdown
---
id: S-1
type: Story
status: To Do
parent: null
created_at: 2026-04-06T12:34:56Z
run_id: 20260406-001
---

## Description

...

## Digest
```

`## Description` and `## Digest` are literal parser anchors and must not be
translated.

## 6. Local Skill Branches

- `read-issue`: resolve file path from the ID prefix, then read frontmatter and
  the `## Description` / `## Digest` sections.
- `digest`: append a timestamped entry under `## Digest`; do not replace prior
  entries.
- `manifest`: create markdown files, then persist bidirectional links by
  editing both sides.
- `status`: no provider-specific divergence; it still reads run state and
  manifests only.
- `cache`: no-op in local mode.

## 7. Link Handling

Local links are stored in frontmatter and must be written bidirectionally.

Reverse mapping:

| Source type | Reverse type |
|-------------|--------------|
| `blocks` | `is blocked by` |
| `is blocked by` | `blocks` |
| `is split into` | `split from` |
| `split from` | `is split into` |
| `relates to` | `relates to` |

For 1:N links, each target is processed independently and manifest status may
become `created`, `partial`, or `failed`.

## 8. Error Notes

- Missing file at the ID-derived path: `ISSUE_NOT_FOUND`
- Invalid local ID prefix: `INVALID_PREFIX`
- Duplicate IDs across type directories: integrity error, abort

## Related

- [SPEC-provider.md](./SPEC-provider.md) — provider abstraction
- [SPEC-skills.md](./SPEC-skills.md) — skills that route to `local`
