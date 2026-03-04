---
name: changelog
user_invocable: true
description: Record self-changes to the daily changelog — detects git changes in watched paths, categorizes them, writes 02_Derived/changelog/YYYY-MM-DD.md, commits, and creates the gate marker
version: 1.0.0
complexity: medium
context_layers: []
orchestrator: changelog skill
plugin: maencof
---

# changelog — Self-Change Recorder

감시 경로의 변경사항을 감지하고 카테고리별로 분류하여 일별 changelog에 기록합니다.

## When to Use This Skill

- changelog-gate Stop hook이 세션 종료를 차단했을 때
- 세션 중 자기 변경(self-changes)을 수동으로 기록하고 싶을 때
- 일일 변경 이력을 확인하거나 갱신할 때

## Watched Paths

| Path | Description |
|------|-------------|
| `01_Core/` | 핵심 정체성 문서 |
| `02_Derived/` | 파생 지식 (changelog 자체는 제외) |
| `.claude/agents/` | AI 에이전트 설정 |
| `.claude/rules/` | AI 행동 규칙 |
| `CLAUDE.md` | 프로젝트 지시사항 |

## Changelog Categories

| Category | Korean Label | Examples |
|----------|-------------|----------|
| `knowledge` | 지식 변경 | 문서 생성, 문서 수정, 내용 갱신 |
| `structure` | 구조 변경 | 디렉토리 추가/이동, 메모리 구조 변경 |
| `automation` | 자동화 | hook 추가/수정, 스크립트 변경 |
| `learning` | 학습 | 새로 발견한 패턴, 기술적 인사이트 |
| `preference` | 사용자 선호 확인 | 확인된 사용자 선호사항, 워크플로우 결정 |

## Workflow

### Step 1 — Detect Changes

감시 경로에서 git 변경사항을 감지한다.

```bash
git status --porcelain -- 01_Core/ 02_Derived/ .claude/agents/ .claude/rules/ CLAUDE.md
```

- `02_Derived/changelog/` 경로의 변경은 제외한다
- 변경이 없으면 "기록할 변경사항이 없습니다." 메시지 후 종료

### Step 2 — Categorize Changes

각 변경 파일을 5개 카테고리 중 하나로 분류한다.

분류 기준:
- `01_Core/`, `02_Derived/` 내 .md 파일 변경 → `knowledge` (지식 변경)
- 디렉토리 추가/삭제/이동, 구조적 파일 변경 → `structure` (구조 변경)
- `.claude/` 내 파일, hook, 스크립트 변경 → `automation` (자동화)
- 변경 내용에서 새로운 패턴이나 인사이트가 감지되면 → `learning` (학습)
- 사용자 선호나 설정 변경이 확인되면 → `preference` (사용자 선호 확인)

하나의 변경이 여러 카테고리에 해당할 수 있다. 가장 적절한 카테고리를 선택한다.

### Step 3 — Read Existing Changelog

오늘 날짜의 기존 changelog 파일이 있는지 확인한다.

- 파일 경로: `02_Derived/changelog/YYYY-MM-DD.md`
- 기존 파일이 있으면 내용을 읽어 중복 기록을 방지한다
- 기존 파일이 없으면 새로 생성한다

### Step 4 — Write Changelog

`maencof_create` 도구 또는 직접 파일 작성으로 changelog를 기록한다.

**파일 형식:**

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

**주의사항:**
- 이미 기록된 내용과 중복되지 않도록 한다
- 각 카테고리에 해당하는 변경이 없으면 해당 섹션을 생략한다
- 경로는 vault 기준 상대 경로로 기록한다

### Step 5 — Commit Changes

changelog 파일을 git에 커밋한다.

```bash
git add 02_Derived/changelog/YYYY-MM-DD.md
git commit -m "docs(changelog): YYYY-MM-DD 자기 변경 기록"
```

**중요:** co-author를 추가하지 않는다.

### Step 6 — Create Gate Marker

changelog-gate 통과를 위한 마커 파일을 생성한다.

```bash
mkdir -p .omc
touch .omc/.changelog-gate-passed
```

이 마커 파일이 있으면 Stop hook이 세션 종료를 허용한다.
마커 파일은 `.gitignore`에 포함되어야 하며, 세션 간 지속되지 않는다.

### Step 7 — Report

기록된 changelog 요약을 사용자에게 표시한다.

```
Changelog 기록 완료: 02_Derived/changelog/YYYY-MM-DD.md
- 지식 변경: N건
- 구조 변경: N건
- 자동화: N건
세션 종료가 허용되었습니다.
```

## Error Handling

- Vault가 초기화되지 않은 경우: "Vault가 초기화되지 않았습니다. `/maencof:setup`을 실행하세요."
- git이 사용 불가능한 경우: changelog 파일만 기록하고 commit은 건너뛴다
- 파일 쓰기 실패 시: 에러 메시지를 표시하고 마커 파일을 생성하지 않는다

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `maencof_create` | Create new vault document (alternative to direct file write) |
| `maencof_read` | Read existing vault document |
