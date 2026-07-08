---
name: changelog
user_invocable: true
description: '[maencof:changelog] Curates self-change entries into the vault changelog. Reads the pending scan state, detects dirty and committed-but-unrecorded changes since the last curation, writes date-grouped entries, and advances the curation cursor. Non-blocking.'
argument-hint: ''
version: '2.0.0'
complexity: medium
context_layers: [2]
orchestrator: changelog skill
plugin: maencof
---

# changelog — Self-Change Recorder

Curates changes in watched paths into daily changelog documents (`02_Derived/changelog/YYYY-MM-DD.md`, Layer 2). Detection happens mechanically (SessionEnd scan + git); this skill adds the semantic layer: categorization, prose, and the "why".

Recording is deferred and retroactive by design. Nothing blocks a session; unrecorded changes are preserved by git and surfaced as a one-line SessionStart advisory until curated.

## When to Use This Skill

- When the SessionStart advisory reports unrecorded watched-path changes
- To manually record self-changes at any time
- To review or update the daily change history

## Watched Paths

| Path              | Description                                   |
| ----------------- | --------------------------------------------- |
| `01_Core/`        | Core identity documents                       |
| `02_Derived/`     | Derived knowledge (excludes changelog itself) |
| `.claude/agents/` | AI agent configuration                        |
| `.claude/rules/`  | AI behavior rules                             |
| `CLAUDE.md`       | Project instructions                          |

## Changelog Categories

| Category     | Korean Label     | Examples                                         |
| ------------ | ---------------- | ------------------------------------------------ |
| `knowledge`  | Knowledge change | Document creation, modification, content updates |
| `structure`  | Structure change | Directory add/move, memory structure changes     |
| `automation` | Automation       | Hook add/modify, script changes                  |
| `learning`   | Learning         | Newly discovered patterns, technical insights    |
| `preference` | User preference  | Confirmed user preferences, workflow decisions   |

## Workflow

### Step 1 — Resolve Vault Root and Read State

Run from the **absolute vault root path** (`setup` Stage 1 collected this; fall back to `MAENCOF_VAULT_PATH` env). Do NOT rely on CWD — this skill can be invoked from a directory other than the vault root.

Read `<vault-root>/.maencof-meta/changelog-state.json` with the Read tool. Schema:

```json
{
  "pending": {
    "detectedAt": "ISO",
    "sessionId": "...",
    "changes": ["M 01_Core/values.md"]
  },
  "lastCuratedAt": "ISO or null"
}
```

- File absent or malformed → treat as `{ "pending": null, "lastCuratedAt": null }`.
- `pending` is the last SessionEnd scan (informational — Step 2 re-detects live).

### Step 2 — Detect Changes (live)

Two complementary sources; exclude anything under `02_Derived/changelog/` from both.

**a. Uncommitted changes** (working tree):

```bash
VAULT="${MAENCOF_VAULT_PATH:-<vault-root>}"
git -C "$VAULT" status --porcelain -- 01_Core/ 02_Derived/ .claude/agents/ .claude/rules/ CLAUDE.md
```

**b. Committed but not yet curated** (only when `lastCuratedAt` is not null):

```bash
git -C "$VAULT" log --since="<lastCuratedAt>" --date=short --pretty=format:"%ad %h %s" --name-status -- 01_Core/ 02_Derived/ .claude/agents/ .claude/rules/ CLAUDE.md
```

If both are empty, report "No changes to record.", still perform Step 6 (advance the cursor, clear stale pending), and exit.

### Step 3 — Enrich Context (optional, best effort)

For better prose and the `learning` / `preference` sections:

- Activity log: NDJSON files under `<vault-root>/.maencof-meta/activity/` for the affected dates (tool-level descriptions of vault writes).
- Auto-captured insights: vault documents tagged `auto-insight` created in the period (source material for learning/preference entries).

Skip silently if unavailable.

### Step 4 — Group by Change Date and Categorize

- Committed changes → the commit date (`%ad` from Step 2b).
- Uncommitted changes → today.
- Classify each change into one of the 5 categories (a change may match several; pick the most appropriate).

### Step 5 — Write Changelog Document(s)

One file per change date: `02_Derived/changelog/YYYY-MM-DD.md`. Read any existing file for that date first to avoid duplicate entries, then write via `mcp__plugin_maencof_t__create` (new) or `mcp__plugin_maencof_t__update` (existing).

**File format:**

```markdown
---
created: YYYY-MM-DD
updated: YYYY-MM-DD
layer: 2
tags: [changelog, growth, daily]
---

## Changelog — YYYY-MM-DD

### 지식 변경

- 문서 수정: 핵심 가치관 갱신 — `01_Core/values.md`

### 자동화

- SessionEnd 스캔 도입 — `.claude/rules/...`
```

**Notes:**

- Omit category sections that have no corresponding changes
- Record paths as relative paths from the vault root
- Entries describe the change and, where inferable, why it happened

### Step 6 — Advance the Cursor

Overwrite `<vault-root>/.maencof-meta/changelog-state.json` with the Write tool:

```json
{ "pending": null, "lastCuratedAt": "<current ISO 8601 timestamp>" }
```

This clears the SessionStart advisory and sets the baseline for the next committed-change detection (Step 2b). On any Step 5 write failure, skip this step so the debt stays visible.

### Step 7 — Commit (best effort)

Commit the changelog file(s). Failure is non-fatal — report it and continue.

```bash
git -C "$VAULT" add 02_Derived/changelog/
git -C "$VAULT" commit -m "docs(changelog): YYYY-MM-DD 자기 변경 기록"
```

**Important:** Do not add a co-author.

### Step 8 — Report

```
Changelog 기록 완료: 02_Derived/changelog/YYYY-MM-DD.md
- 지식 변경: N건
- 자동화: N건
커서 갱신: lastCuratedAt = <ISO>
```

## Error Handling

- Vault not initialized: "Vault is not initialized. Please run `/maencof:setup`."
- git unavailable: curate from `pending.changes` and the activity log only; note the degraded source in the report
- Document write failure: display the error and do NOT advance the cursor (Step 6)

## Available Tools

| Tool                            | Type   | Purpose                                                               |
| ------------------------------- | ------ | --------------------------------------------------------------------- |
| `mcp__plugin_maencof_t__create` | MCP    | Create new vault document                                             |
| `mcp__plugin_maencof_t__read`   | MCP    | Read existing vault document                                          |
| `mcp__plugin_maencof_t__update` | MCP    | Update existing vault document (when the date's entry already exists) |
| `Read` / `Write`                | Native | Read and update `.maencof-meta/changelog-state.json`                  |
| `Bash`                          | Native | Run git commands (status, log, add, commit)                           |
