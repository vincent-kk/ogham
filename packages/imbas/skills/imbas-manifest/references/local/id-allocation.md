# Local Provider — ID Allocation

Transcribed from `.omc/plans/imbas-local-provider.md §3.2` as single source of
truth. See also `SPEC-provider-local.md §3.2`.

## Format

- **Story**: `S-<N>`
- **Task**: `T-<N>`
- **Subtask**: `ST-<N>`

`<N>` is a non-negative integer. Counters are **per prefix**, not global. A
project may simultaneously have `S-1`, `T-1`, `ST-1` with no collision.

## Algorithm (per item, not per batch)

For each pending item at execution time:

1. `Glob .imbas/<KEY>/issues/<type>/*.md` where `<type>` is `stories`, `tasks`,
   or `subtasks` matching the item's `type` field.
2. Extract `<N>` from each filename via regex `^(S|T|ST)-(\d+)\.md$`.
3. Compute `max = max(all extracted N values); if no files exist, max = 0`.
4. Next ID = `<PREFIX>-(max + 1)`.
5. **Immediately** `Write` the file at the derived path.
6. **Immediately** save the manifest with the new `issue_ref`.
7. Move to the next item (re-run Glob — do NOT cache or batch-allocate).

## Rationale

- **Directory is truth**: no auxiliary `.counter.json` file to drift out of sync
  with actual content.
- **Allocate-then-write per item**: a crash between Glob (step 1-4) and Write
  (step 5) is safe — the next run will Glob again and see only fully-written
  files, so no duplicate ID is ever issued.
- **Batch allocation is forbidden**: if a skill pre-computed IDs for 10 items
  and crashed after writing 3, a subsequent run could re-issue IDs for items
  4-10 against a stale max, potentially overwriting the first 3. Per-item Glob
  eliminates this.
- **Type-prefixed IDs**: cross-directory `Glob <ID>` is unambiguous. The prefix
  uniquely determines the type directory. `ISSUE_DUPLICATE` becomes an
  integrity error, never a routine case.

## Crash recovery

Acceptable behaviors:

- **Gaps from crashes**: if a crash destroys a file mid-write, the next run may
  issue a new ID with the same number (if the file was deleted cleanly) or a
  higher number (if the partial file remains). Both are acceptable.
- **Gaps from user deletion**: if a user manually deletes `S-3.md`, the next
  Glob will see `S-1`, `S-2`, `S-4`, `S-5` → max = 5 → next = `S-6`. The gap
  at `S-3` remains, which is fine (Jira behaves the same way).

## Out of scope

- **Concurrent writers**: v1 assumes a single writer per project. Multi-writer
  mutex is deferred per `SPEC-provider-local §Concurrency`.
- **ID reuse after deletion**: IDs are never reused. Deleted files leave gaps.
