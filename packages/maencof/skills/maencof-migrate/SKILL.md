---
name: maencof-migrate
user_invocable: true
description: "[maencof:maencof-migrate] Upgrades the vault from v1 flat 5-Layer layout to v2 with L3 sub-layers and L5 Buffer/Boundary separation, safely preserving and relocating all existing documents."
argument-hint: "[--dry-run] [--rollback]"
version: "1.0.0"
complexity: medium
context_layers: []
orchestrator: maencof-migrate skill
plugin: maencof
---

# maencof-migrate — Vault Architecture Migration

Upgrades the vault directory structure from v1 (flat 5-Layer) to v2 (L3 sub-layers + L5 Buffer/Boundary).

## When to Use This Skill

- After updating the maencof plugin when session-start shows an architecture migration advisory
- To upgrade from flat `03_External/` to `03_External/{relational,structural,topical}/`
- To upgrade from flat `05_Context/` to `05_Context/{buffer,boundary}/`

## Prerequisites

- The maencof vault must be initialized
- If not initialized: guide to run `/maencof:maencof-setup`

## Important Constraints

- **Migration assumes exclusive vault access.** Do not run other maencof tools (`mcp_t_kg_build`, `mcp_t_create`, `mcp_t_update`, etc.) concurrently during migration.
- Migration is always explicit — never auto-triggered.
- All operations are WAL-based and individually reversible.

## Workflow

### Step 1 — Version Check

Check the current architecture version:

- Read `.maencof-meta/version.json` → `architecture_version` field
- If absent, assume `1.0.0`
- Compare with expected version (`2.0.0`)
- If already up to date: inform user and exit

### Step 2 — Plan Preview

Generate and display a migration plan WITHOUT executing:

- List all directories to create
- List all files to move (with L3 classification: relational/structural/topical)
- Show frontmatter fields to update (`sub_layer`)
- Display summary counts

Present the plan to the user for review.

### Step 3 — User Confirmation

**STOP HERE. Do NOT proceed to Step 3.5 until the user explicitly responds.**

Present the plan summary and ask for confirmation. Show:

- Total number of operations
- Reminder about exclusive vault access
- Rollback availability

Then use the `AskUserQuestion` tool to ask:

> "Proceed with this migration plan?"
> Options: "Yes, execute" / "No, cancel"

Wait for the user's answer before taking any action.

- If user confirms ("yes"): proceed to Step 3.5 (create lock) then Step 4 (execute).
- If user declines ("no") or does not explicitly confirm: exit immediately without any file changes. **No lock was created, so nothing to clean up.**

### Step 3.5 — Create Migration Lock (post-approval)

**Only enter this step after Step 3 returns "Yes, execute".** Creating the lock
before approval is forbidden because an aborted session would leave a stale
`migration.lock` that blocks unrelated future sessions from completing their
changelog-gate check.

Write `.maencof-meta/migration.lock`:
```json
{
  "startedAt": "<current ISO timestamp>",
  "ttlMinutes": 30,
  "sessionId": "<input.session_id or null>"
}
```

When this file exists, the changelog-gate Stop hook recognizes that a migration
is in progress and allows session termination. The `changelog-gate` hook also
cleans up orphan locks (TTL expired **or** sessionId absent from the current
session) on every entry, so even an unexpected crash between Step 3.5 and
Step 5 will self-heal on the next session's first Stop event.

If the `.maencof-meta/migration.lock` pattern is not in the vault root
`.gitignore`, add it.

### Step 4 — Execute Migration

Execute the plan using WAL (Write-Ahead Log):

1. Create subdirectories under `03_External/` and `05_Context/`
2. Move L3 documents to classified subdirectories
3. Update frontmatter `sub_layer` field for moved documents
4. Update `architecture_version` in `version.json`

Each operation is recorded in the WAL before execution.

### Step 5 — Report Results

Display migration results:

- Operations executed successfully
- Any errors encountered
- Rollback instructions if needed
- Recommendation to run `/maencof:maencof-checkup` for post-migration health check

After reporting results (whether migration succeeded or rollback occurred):
- Delete `.maencof-meta/migration.lock` if it exists.

## L3 Classification Rules

Documents in `03_External/` are classified by:

1. `person` or `person_ref` field present → **relational**
2. `org_type` field present → **structural**
3. Tag heuristics (person/people/friend/colleague/mentor → relational; company/organization/team/community → structural)
4. Default → **topical**

## Rollback

If migration fails or produces unexpected results:

- The WAL file at `.maencof-meta/migration-wal.json` records all operations
- Completed operations can be reversed in order
- Rollback restores files to their original locations and removes added frontmatter fields

## Options

```
/maencof:maencof-migrate [--dry-run] [--rollback]
```

| Option       | Default | Description                           |
| ------------ | ------- | ------------------------------------- |
| `--dry-run`  | false   | Show migration plan without executing |
| `--rollback` | false   | Rollback the last migration using WAL |
