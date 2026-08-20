<!-- Loaded on demand by skills/migrate/SKILL.md when the `architecture` option is selected. Do not load for other options. -->

# migrate — Vault Architecture Migration

Upgrades the vault directory structure to v3: L3 sub-layers, a flat Layer 5, and cross-layer hubs carried as a frontmatter attribute instead of a sub-layer.

Two upgrade paths run through the same plan — a v1 vault (flat 5-Layer) needs the L3 split, and a v2 vault additionally needs Layer 5 flattened and its boundary documents converted to hubs. The plan emits only the operations the vault actually needs, so running it on a partially-migrated vault is safe.

## When to Use This Skill

- After updating the maencof plugin when session-start shows an architecture migration advisory
- To upgrade from flat `03_External/` to `03_External/{relational,structural,topical}/`
- To flatten `05_Context/{buffer,boundary}/` back into `05_Context/` (v2 → v3; Layer 5 has no sub-layers)
- To convert `05_Context/boundary/` MOC documents into L3-structural hubs (`hub: true`)

## Prerequisites

- The maencof vault must be initialized
- If not initialized: guide to run `/maencof:setup`

## Important Constraints

- **Migration assumes exclusive vault access.** Do not run other maencof tools (`mcp__plugin_maencof_tools__kg_build`, `mcp__plugin_maencof_tools__create`, `mcp__plugin_maencof_tools__update`, etc.) concurrently during migration.
- Migration is always explicit — never auto-triggered.
- All operations are WAL-based and individually reversible.

## Workflow

### Step 1 — Version Check

Check the current architecture version:

- Read `.maencof-meta/version.json` → `architecture_version` field
- If absent, assume `1.0.0`
- Compare with the plugin's expected version — currently `3.0.0`. The canonical value is `EXPECTED_ARCHITECTURE_VERSION` in `src/constants/architecture.ts`; this document is a copy and the constant wins if they disagree.
- If already up to date: inform user and exit

### Step 2 — Plan Preview

Generate and display a migration plan WITHOUT executing:

- List all directories to create (L3 sub-layers) and to remove (emptied `05_Context/{buffer,boundary}/`)
- List all files to move — L3 documents with their classification (relational/structural/topical), Layer 5 buffer documents flattening to `05_Context/`, and boundary documents moving to `03_External/structural/`
- Show frontmatter fields to update: `sub_layer` for classified L3 documents; `sub_layer` removal for flattened Layer 5 documents; and for each boundary document the conversion to `layer: 3` + `sub_layer: structural` + `hub: true` + `hub_kind` + `purpose`, dropping the retired `boundary_type` and `connected_layers`
- Display summary counts

Present the plan to the user for review.

### Step 3 — User Confirmation

**STOP HERE. Do NOT proceed to Step 4 until the user explicitly responds.**

Present the plan summary and ask for confirmation. Show:

- Total number of operations
- Reminder about exclusive vault access
- Rollback availability

Then use the `AskUserQuestion` tool to ask:

> "Proceed with this migration plan?" Options: "Yes, execute" / "No, cancel"

Wait for the user's answer before taking any action.

- If user confirms ("yes"): proceed to Step 4 (execute).
- If user declines ("no") or does not explicitly confirm: exit immediately without any file changes.

### Step 4 — Execute Migration

Execute the plan using WAL (Write-Ahead Log):

1. Create missing L3 subdirectories under `03_External/` (Layer 5 is flat — it gets none)
2. Move loose `03_External/` documents into their classified subdirectory and set `sub_layer`
3. Flatten `05_Context/buffer/` documents into `05_Context/` and remove their `sub_layer`
4. Move `05_Context/boundary/` documents into `03_External/structural/` and convert them to hubs
5. Remove the emptied `05_Context/{buffer,boundary}/` directories
6. Update `architecture_version` in `version.json`

Each operation is recorded in the WAL before execution.

### Step 5 — Report Results

Display migration results:

- Operations executed successfully
- Any errors encountered
- Rollback instructions if needed
- Recommendation to run `/maencof:checkup` for post-migration health check

## L3 Classification Rules

Documents in `03_External/` are classified by:

1. `person` or `person_ref` field present → **relational**
2. `org_type` field present → **structural**
3. Tag heuristics (person/people/friend/colleague/mentor → relational; company/organization/team/community → structural)
4. Default → **topical**

## Layer 5 and Hub Conversion (v2 → v3)

Layer 5 is the flat unclassified inbox — it has no sub-layers. Cross-layer hubs are not a layer at all but a frontmatter attribute any L1–L4 document can carry, so v2's `boundary` sub-layer has no v3 equivalent and its documents move to where the knowledge belongs.

| v2                                                | v3                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `05_Context/buffer/x.md`, `sub_layer: buffer`     | `05_Context/x.md`, no `sub_layer`                                      |
| `05_Context/boundary/y.md`, `sub_layer: boundary` | `03_External/structural/y.md`, `sub_layer: structural`, `hub: true`    |
| `boundary_type: project_moc`                      | `hub_kind: project_moc` (unknown values converge to `cross_domain`)    |
| `connected_layers: [2, 3]`                        | removed — hubs select targets by tag overlap, not by a layer list      |
| —                                                 | `purpose` (required when `hub: true`; filled from `title` when absent) |

`purpose` is filled rather than left empty on purpose: the v3 schema rejects `hub: true` without it, so a converted document that arrived without one would be unreadable the moment migration finished.

## Rollback

If migration fails or produces unexpected results:

- The WAL file at `.maencof-meta/migration-wal.json` records all operations
- Completed operations can be reversed in order
- Rollback restores files to their original locations, restores the previous frontmatter values, and recreates any directory the migration removed

## Options

```
/maencof:migrate architecture [--dry-run] [--rollback]
```

| Option       | Default | Description                           |
| ------------ | ------- | ------------------------------------- |
| `--dry-run`  | false   | Show migration plan without executing |
| `--rollback` | false   | Rollback the last migration using WAL |
