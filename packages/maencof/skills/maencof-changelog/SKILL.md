---
name: maencof-changelog
user_invocable: true
description: "[maencof:maencof-changelog] Records daily self-change entries to the vault changelog. Detects git changes, writes the dated entry, commits it, and unblocks the changelog-gate Stop hook."
argument-hint: ""
version: "1.0.0"
complexity: medium
context_layers: [2]
orchestrator: maencof-changelog skill
plugin: maencof
---

# maencof-changelog — Self-Change Recorder

Detects changes in watched paths, categorizes them, and records them in the daily changelog.

## When to Use This Skill

- When the changelog-gate Stop hook blocks session termination
- To manually record self-changes during a session
- To review or update the daily change history

## Watched Paths

| Path | Description |
|------|-------------|
| `01_Core/` | Core identity documents |
| `02_Derived/` | Derived knowledge (excludes changelog itself) |
| `.claude/agents/` | AI agent configuration |
| `.claude/rules/` | AI behavior rules |
| `CLAUDE.md` | Project instructions |

## Changelog Categories

| Category | Korean Label | Examples |
|----------|-------------|----------|
| `knowledge` | Knowledge change | Document creation, modification, content updates |
| `structure` | Structure change | Directory add/move, memory structure changes |
| `automation` | Automation | Hook add/modify, script changes |
| `learning` | Learning | Newly discovered patterns, technical insights |
| `preference` | User preference | Confirmed user preferences, workflow decisions |

## Workflow

### Step 1 — Detect Changes

Detect git changes in watched paths.

```bash
git status --porcelain -- 01_Core/ 02_Derived/ .claude/agents/ .claude/rules/ CLAUDE.md
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

Write the changelog using the `maencof_create` tool or direct file creation.

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

Commit the changelog file to git.

```bash
git add 02_Derived/changelog/YYYY-MM-DD.md
git commit -m "docs(changelog): YYYY-MM-DD 자기 변경 기록"
```

**Important:** Do not add a co-author.

### Step 6 — Create Gate Marker

Create the marker file to pass the changelog-gate.

```bash
mkdir -p .omc
touch .omc/.changelog-gate-passed
```

When this marker file exists, the Stop hook allows session termination.
The marker file must be included in `.gitignore` and does not persist across sessions.

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

- Vault not initialized: "Vault is not initialized. Please run `/maencof:maencof-setup`."
- git unavailable: record the changelog file only and skip commit
- File write failure: display error message and do not create the marker file

## Available Tools

| Tool | Type | Purpose |
|------|------|---------|
| `maencof_create` | MCP | Create new vault document (alternative to direct file write) |
| `maencof_read` | MCP | Read existing vault document |
| `Bash` | Native | Run git commands (status, add, commit) |
