---
name: doctor
user_invocable: true
description: 6가지 진단 + 보고서 생성 + 자동 수정 제안 — 지식 저장소 건강도 점검
version: 1.0.0
complexity: high
context_layers: [1, 2, 3, 4]
orchestrator: doctor 스킬
---

# doctor — 지식 저장소 진단

6가지 진단 항목으로 지식 저장소 건강도를 점검하고 자동 수정을 제안한다.
doctor 에이전트를 위임하여 상세 분석을 수행한다.

## When to Use This Skill

- 지식 저장소 전반적인 건강 상태를 점검하고 싶을 때
- 깨진 링크, 고립 노드, Frontmatter 오류를 한번에 확인하고 싶을 때
- 정기적인 vault 유지보수 시

## 에이전트 협업 시퀀스

```
[doctor 스킬] → [doctor 에이전트] → DiagnosticResult
                                  ↓
                     자동 수정 가능 항목 분류
                                  ↓
              사용자 확인 → 자동 수정 실행 (AutoFixAction)
```

**오케스트레이터**: doctor 스킬이 doctor 에이전트를 위임하여 6가지 진단을 수행한다.

## 6가지 진단 항목

| # | 진단 항목 | 심각도 | 자동 수정 가능 |
|---|----------|--------|--------------|
| 1 | **고립 노드** (orphan-node) | warning | 부분 가능 |
| 2 | **stale 인덱스** (stale-index) | warning | 가능 (`/coffaen:rebuild`) |
| 3 | **깨진 링크** (broken-link) | error | 불가 (수동 확인 필요) |
| 4 | **Layer 위반** (layer-mismatch) | error | 부분 가능 |
| 5 | **중복 문서** (duplicate) | warning | 부분 가능 |
| 6 | **Frontmatter 검증** (invalid-frontmatter) | error | 가능 |

## 워크플로우

### Step 1 — 진단 실행

doctor 에이전트에 6가지 진단을 위임:
- `kg_status`로 stale 노드 및 고립 노드 확인
- backlink-index.json 유효성 검증
- 모든 .md 파일 Frontmatter Zod 스키마 검증
- Layer 디렉토리 규칙 준수 확인

### Step 2 — 보고서 생성

```markdown
## 진단 보고서 — {날짜}

### 요약
- 오류: N개 | 경고: N개 | 정보: N개
- 자동 수정 가능: N개

### 상세 진단
#### 깨진 링크 (오류)
- {파일}: {링크} → 참조 불가

#### Frontmatter 오류 (오류)
- {파일}: missing required field 'tags'

#### 고립 노드 (경고)
- {파일}: 인바운드/아웃바운드 링크 없음

### 권장 액션
1. /coffaen:rebuild — stale 인덱스 재구축
2. 깨진 링크 N개 수동 수정 필요
```

### Step 3 — 자동 수정 실행

사용자 확인 후 AutoFixAction 실행:
- Frontmatter 누락 필드 자동 보완 (`coffaen_update`)
- stale 인덱스 재구축 위임 (`/coffaen:rebuild`)

## Available MCP Tools

| 도구 | 용도 |
|------|------|
| `kg_status` | 인덱스 상태, stale/orphan 노드 |
| `coffaen_read` | Frontmatter 검증 |
| `coffaen_update` | Frontmatter 자동 수정 |
| `kg_navigate` | 링크 유효성 확인 |

## Options

```
/coffaen:doctor [--fix] [--check <항목>]
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--fix` | false | 자동 수정 실행 (확인 후) |
| `--check` | all | 특정 진단 항목만 실행 |
