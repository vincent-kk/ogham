---
name: changelog
user_invocable: true
description: '[maencof:changelog] Records daily self-change entries to the vault changelog. Detects git changes, writes the dated entry, commits it, and unblocks the changelog-gate Stop hook.'
argument-hint: ''
version: '1.0.0'
complexity: medium
context_layers: [2]
orchestrator: changelog skill
plugin: maencof
---

# changelog — Self-Change Recorder

Detects changes in watched paths, categorizes them, and records them in the daily changelog.

## When to Use This Skill

- When the changelog-gate Stop hook blocks session termination
- To manually record self-changes during a session
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

### Step 1 — Detect Changes

Detect git changes in watched paths. Run from the **absolute vault root path** (`setup` Stage 1 collected this; fall back to `MAENCOF_VAULT_PATH` env). Do NOT rely on CWD — this skill can also be invoked manually from a directory other than the vault root.

```bash
VAULT="${MAENCOF_VAULT_PATH:-<vault-root>}"
git -C "$VAULT" status --porcelain -- 01_Core/ 02_Derived/ .claude/agents/ .claude/rules/ CLAUDE.md
```

- Exclude changes under `02_Derived/changelog/`
- If no changes found, display "No changes to record." and exit

### Step 2 — Categorize Changes

Classify each changed file into one of 5 categories.

Classification criteria:

- `.md` file changes in `01_Core/`, `02_Derived/` → `knowledge`
- Directory add/delete/move, structural file changes → `structure`
- Files in `.claude/`, hook or script changes → `automation`
- New patterns or insights detected in changes → `learning`
- User preference or setting changes confirmed → `preference`

A single change may match multiple categories. Choose the most appropriate one.

### Step 3 — Read Existing Changelog

Check if a changelog file for today's date already exists.

- File path: `02_Derived/changelog/YYYY-MM-DD.md`
- If existing file found, read its content to prevent duplicate entries
- If no existing file, create a new one

### Step 4 — Write Changelog

Write the changelog using the `mcp__plugin_maencof_t__create` tool (new file) or `mcp__plugin_maencof_t__update` tool (existing file).

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

### 구조 변경

- 새 카테고리 디렉토리 생성 — `02_Derived/insights/`

### 자동화

- changelog-gate Stop hook 추가 — `.claude/agents/changelog.md`

### 학습

- Knowledge Graph 탐색 시 spreading activation 파라미터 조정 패턴 발견

### 사용자 선호 확인

- 커밋 시 co-author 미사용 선호 확인
```

**Notes:**

- Avoid duplicating already recorded entries
- Omit category sections that have no corresponding changes
- Record paths as relative paths from the vault root

### Step 5 — Commit Changes (synchronous)

**Important:** Commit must be executed synchronously. Proceed to Step 6 only if the commit succeeds.
On commit failure, output the error, skip Step 6 (Gate Marker), and proceed to Step 7 (Report). Do not create the marker file.
Do not output progress in real time — only show the summary in Step 7 after completion.

Commit the changelog file to git in the vault repo (substitute the literal absolute path or use `MAENCOF_VAULT_PATH` as a fallback — same pattern as Step 1).

```bash
VAULT="${MAENCOF_VAULT_PATH:-<vault-root>}"
git -C "$VAULT" add 02_Derived/changelog/YYYY-MM-DD.md
git -C "$VAULT" commit -m "docs(changelog): YYYY-MM-DD 자기 변경 기록"
```

**Important:** Do not add a co-author.

### Step 6 — Create Gate Marker

Create the marker file to pass the changelog-gate. Use the same absolute vault root as Steps 1/5 — the Stop hook checks the marker relative to the vault, not to wherever this skill happens to run.

```bash
VAULT="${MAENCOF_VAULT_PATH:-<vault-root>}"
mkdir -p "$VAULT/.omc"
touch "$VAULT/.omc/.changelog-gate-passed"
```

When this marker file exists, the Stop hook allows session termination.
The marker file must be included in `.gitignore`. It is session-scoped: the SessionStart hook deletes it, so each new session re-arms the gate.

### Step 7 — Report

Display the recorded changelog summary to the user.

```
Changelog 기록 완료: 02_Derived/changelog/YYYY-MM-DD.md
- 지식 변경: N건
- 구조 변경: N건
- 자동화: N건
세션 종료가 허용되었습니다.
```

## Error Handling

- Vault not initialized: "Vault is not initialized. Please run `/maencof:setup`."
- git unavailable: record the changelog file only and skip commit
- File write failure: display error message and do not create the marker file

## Available Tools

| Tool                            | Type   | Purpose                                                            |
| ------------------------------- | ------ | ------------------------------------------------------------------ |
| `mcp__plugin_maencof_t__create` | MCP    | Create new vault document (alternative to direct file write)       |
| `mcp__plugin_maencof_t__read`   | MCP    | Read existing vault document                                       |
| `mcp__plugin_maencof_t__update` | MCP    | Update existing vault document (when today's entry already exists) |
| `Bash`                          | Native | Run git commands (status, add, commit)                             |
