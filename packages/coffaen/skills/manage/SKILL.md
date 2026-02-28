---
name: manage
user_invocable: true
description: 스킬/에이전트 lifecycle 관리 — list/disable/enable/delete/create/report 모드
version: 1.0.0
complexity: medium
context_layers: [1, 2, 3, 4]
orchestrator: manage 스킬
---

# manage — 스킬 및 에이전트 관리

coffaen 플러그인의 스킬과 에이전트 lifecycle을 관리한다.
usage-stats.json 기반 사용 빈도 보고와 비활성화/활성화를 지원한다.

## When to Use This Skill

- 사용하지 않는 스킬을 비활성화하고 싶을 때
- 스킬/에이전트 사용 통계를 확인하고 싶을 때
- 새 커스텀 스킬을 등록하고 싶을 때
- "스킬 관리", "에이전트 관리", "manage"

## 모드

### list 모드
```
/coffaen:manage list [--skills|--agents|--all]
```
설치된 모든 스킬/에이전트 목록과 활성화 상태를 표시한다.

### report 모드
```
/coffaen:manage report [--days <N>]
```
usage-stats.json을 분석하여 사용 빈도 보고서를 생성한다:

```markdown
## 스킬/에이전트 사용 보고서 (최근 N일)

| 이름 | 호출 횟수 | 마지막 사용 | 상태 |
|------|---------|-----------|------|
| explore | 12 | 2026-02-28 | 활성 |
| organize | 3 | 2026-02-20 | 활성 |
| ingest | 0 | — | 비활성 권장 |
```

### disable 모드
```
/coffaen:manage disable <name>
```
스킬 또는 에이전트를 비활성화한다.
disabled-registry.json에 등록하여 플러그인 로드 시 건너뛴다.

```typescript
// DisabledRegistryEntry 타입 기반
{
  name: string,
  type: 'skill' | 'agent',
  disabledAt: string,
  reason?: string
}
```

### enable 모드
```
/coffaen:manage enable <name>
```
비활성화된 스킬/에이전트를 다시 활성화한다.

### delete 모드
```
/coffaen:manage delete <name> [--force]
```
커스텀 스킬/에이전트를 영구 삭제한다.
기본 제공 항목은 삭제 불가 (disable 사용).

### create 모드
```
/coffaen:manage create <name> --type <skill|agent>
```
새 커스텀 스킬/에이전트 템플릿을 생성한다:
- 스킬: `skills/<name>/SKILL.md` 생성 (기본 템플릿 적용)
- 에이전트: `agents/<name>.md` 생성 (기본 템플릿 적용)

## 워크플로우

### report 모드 워크플로우

```
1. .coffaen-meta/usage-stats.json 읽기
2. 기간 필터링 (--days 옵션)
3. 사용 빈도 집계
4. 0회 사용 항목 → "비활성화 권장" 표시
5. 보고서 출력
```

### disable/enable 워크플로우

```
1. .coffaen-meta/disabled-registry.json 읽기
2. 항목 추가/제거
3. 변경 내용 저장
4. 결과 확인 메시지 출력
```

## Available MCP Tools

| 도구 | 용도 |
|------|------|
| `coffaen_read` | usage-stats.json, disabled-registry.json 조회 |
| `coffaen_create` | 새 스킬/에이전트 파일 생성 |
| `coffaen_update` | disabled-registry.json 갱신 |

## ManageResult 타입

```typescript
// src/types/manage.ts 기반
{
  mode: ManageMode,
  action: SkillLifecycleAction,
  affected: string[],
  success: boolean,
  message: string
}
```
