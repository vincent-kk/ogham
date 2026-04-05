---
version: 1.0
status: active
updated: 2026-04-06
---

# SPEC-provider-local — Local Provider Executor

## Purpose

Full specification for the `local` issue tracker provider. Stores
Story/Task/Subtask entities as markdown files with YAML frontmatter under
`.imbas/<PROJECT-KEY>/issues/{stories,tasks,subtasks}/`. Selected via
`config.provider = "local"`.

## Storage layout

```
.imbas/<PROJECT-KEY>/
├── config.json
├── issues/
│   ├── stories/
│   │   └── S-<N>.md
│   ├── tasks/
│   │   └── T-<N>.md
│   └── subtasks/
│       └── ST-<N>.md
└── runs/<run-id>/
    ├── stories-manifest.json
    └── devplan-manifest.json
```

`<PROJECT-KEY>` comes from `config.defaults.project_ref`. If unset, it
falls back to `LOCAL`.

`issues/` is project-level, run-independent. Runs store only manifests.
No separate `epics/` subdirectory — Epic identity lives in Story
frontmatter `epic:` field.

## ID allocation — prefix by type, allocate-then-write

ID format per type:
- Story → `S-<N>`
- Task  → `T-<N>`
- Subtask → `ST-<N>`

`<N>` is a non-negative integer. Counters are **per prefix**, so a project
may have `S-1`, `T-1`, `ST-1` simultaneously without collision.

### Allocation algorithm

For each pending item at execution time:

1. `Glob .imbas/<KEY>/issues/<type>/*.md` where `<type>` matches the item.
2. Extract `<N>` via regex `^(S|T|ST)-(\d+)\.md$`.
3. `max = max(all extracted N values); if no files exist, max = 0`.
4. Next ID = `<PREFIX>-(max + 1)`.
5. **Immediately `Write` the file** at the derived path.
6. **Immediately** save the manifest with the new `issue_ref`.
7. Move to the next item — re-run Glob. Do NOT batch-allocate.

### Rationale

- **Directory is truth**: no auxiliary `.counter.json` to drift out of sync.
- **Per-item allocation**: crash-safe. A kill between Glob and Write is
  benign because the next run's Glob sees only fully-written files and
  correctly computes the next max.
- **No batch allocation**: pre-computing 10 IDs then writing them
  sequentially would, on a crash after 3 writes, allow the next run to
  re-issue IDs 4-10 against a stale max, potentially overwriting or
  double-allocating. Per-item Glob makes this impossible.
- **Prefix-by-type**: cross-directory lookup by ID is unambiguous. The
  prefix determines the target subdirectory. `ISSUE_DUPLICATE` becomes a
  hard-fail integrity error, never a routine case.

### Crash-recovery semantics

- ID gaps from crashes or manual deletion are acceptable (Jira behaves
  the same).
- IDs are never reused after deletion.

### Concurrency

**Out of v1 scope.** imbas assumes a single writer per project. Multi-writer
mutex is deferred. If detected in future (e.g., timestamp checks, lock
files), abort with a clear error message.

## `issue_ref` in manifests

Store the ID string only, never a file path:
- `"S-42"` ✓
- `".imbas/MYPROJ/issues/stories/S-42.md"` ✗

The file path is derived at read time from the ID prefix. The manifest
schema (`StoryItemSchema.issue_ref: z.string().nullable()`) is
provider-agnostic and must not be extended for local paths.

## Markdown file format

### Frontmatter schema

```yaml
---
id: S-1
type: Story                     # Story | Task | Subtask
title: "사용자 로그인 플로우"
status: To Do                   # To Do | Ready for Dev | In Progress | In Review | Done
parent: null                    # Subtask: parent Task/Story ID. Story/Task: null
epic: null                      # Story: Epic identifier or null. Task/Subtask: omit
links:
  - type: blocks                # blocks | is blocked by | is split into | split from | relates to
    to: S-5
verification:                    # Story only — omit for Task/Subtask
  anchor_link: true
  coherence: PASS
  reverse_inference: PASS
size_check: PASS                # Story only
split_from: null                # Story only
split_into: []                  # Story only
created_at: 2026-04-06T12:34:56Z
run_id: 20260406-001
---
```

### Field rules

- `id` matches `^(S|T|ST)-\d+$`.
- `type` is literal `Story`, `Task`, or `Subtask` — English anchors for parsers.
- `status` one of five workflow states listed above.
- `parent` required for Subtask; null for Story/Task.
- `epic` Story-only; omit the key entirely for Task/Subtask.
- `links[]` array of `{type, to}` objects; see Link handling below.
- `verification`, `size_check`, `split_from`, `split_into` are Story-only;
  omit entirely for Task/Subtask (do not set to null).
- `created_at` ISO 8601 UTC.
- `run_id` identifier of the run that created the file.

### Body

```markdown
## Description

(original description body, language per config.language.issue_content)

## Digest
<!-- initially empty; /imbas:digest appends append-only entries -->
```

- `## Description` and `## Digest` are English literal section headings.
  Parsers rely on them as anchors. Do NOT translate.
- `## Description` body content follows `config.language.issue_content`
  (default `ko`).
- `## Digest` is **append-only**. New entries are timestamped `### ISO8601`
  subsections.

## Link handling (bidirectional)

Every link MUST be recorded on both sides. If A has `{type: X, to: B}`,
then B has `{type: reverse(X), to: A}`.

Reverse mapping:

| Source type     | Reverse type     |
|-----------------|------------------|
| `blocks`        | `is blocked by`  |
| `is blocked by` | `blocks`         |
| `is split into` | `split from`     |
| `split from`    | `is split into`  |
| `relates to`    | `relates to`     |

`relates to` is symmetric — both sides use the same label.

Write protocol:
1. Resolve both source and target file paths from their IDs.
2. `Edit` source file: append `{type: source_type, to: target_id}` to the
   frontmatter `links:` array.
3. `Edit` target file: append the reverse entry.
4. If either `Edit` fails, report and do NOT roll back the other side. A
   future `scripts/check-bidirectional-links.mjs` run can detect and
   repair the asymmetry.

1:N expansion (when `link.to` is an array): repeat the protocol per target.
Per-target failure is tracked in the manifest link status:
- `"created"` all targets succeeded
- `"partial"` some succeeded, some failed
- `"failed"` all failed

## Per-skill local branches

### read-issue (local)
- Resolve type folder from the ID prefix.
- `Glob` the expected path; raise `ISSUE_NOT_FOUND` if missing.
- `Read` + parse frontmatter and body (`## Description`, `## Digest`).
- Return a structured JSON matching the shared output schema, with
  `participants: []` (no multi-participant thread in local) and
  `comment_count` = number of `### ISO8601` entries under `## Digest`.

### digest (local)
- Step 1-5 (read, state track, QA prompting, compression, format) run via
  the shared skeleton using read-issue's local output.
- Step 6: `Edit` the target file's `## Digest` section to append a new
  `### {timestamp}` entry. NEVER replace the section; always append.
- No marker comment — the section-plus-timestamp structure is the
  machine-readable boundary.

### status (local)
- No change. `status` skill is provider-agnostic (0-line divergence) and
  reads `run_get`/`run_list`/`manifest_get` identically for all providers.

### cache (local)
- **No-op.** `/imbas:setup refresh-cache` in local mode returns
  "cache is not applicable to local provider" and exits.

### setup (local)
- Provider selection step added to `/imbas:setup init`.
- On `local` selection: create
  `.imbas/<KEY>/issues/{stories,tasks,subtasks}/`; skip Jira metadata cache.
- Banner warning: "Switching provider away from `local` will strand the
  `.imbas/<KEY>/issues/` tree. imbas does not migrate local issues to a
  remote tracker. Export manually before changing provider."

## Error taxonomy

- `ISSUE_NOT_FOUND` — file missing at the ID-derived path.
- `ISSUE_DUPLICATE` — same ID across multiple type directories. Should be
  impossible with prefix-by-type IDs. If seen, abort with an integrity
  error and require manual cleanup.
- `INVALID_PREFIX` — ID not matching `^(S|T|ST)-\d+$`.
- Asymmetric link — repair is a future `imbas:repair-links` operation.

## Migration

There is no automated migration from local to Jira/GitHub or vice versa
in v1. The banner warning above is the canonical user-facing notice.
Future tooling may add export / reconcile operations.
