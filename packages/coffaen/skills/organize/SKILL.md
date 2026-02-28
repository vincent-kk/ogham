---
name: organize
user_invocable: true
description: memory-organizer 에이전트 오케스트레이션 — 지식 전이 추천 및 실행
version: 1.0.0
complexity: high
context_layers: [1, 2, 3, 4]
orchestrator: organize 스킬
---

# organize — 지식 전이 오케스트레이션

memory-organizer 에이전트를 실행하여 Layer 간 문서 전이를 추천하고 실행한다.
judge 모듈로 후보를 평가한 뒤, 사용자 확인 후 execute 모듈이 실제 이동을 수행한다.

## When to Use This Skill

- Layer 3/4 문서 중 내재화 후보를 정리하고 싶을 때
- 접근 빈도가 높은 외부 참조를 Layer 2로 승격하고 싶을 때
- 만료된 Layer 4 문서를 정리하고 싶을 때
- "기억 정리", "지식 정리", "문서 이동"

## 에이전트 협업 시퀀스

```
[organize 스킬] → [memory-organizer.judge] → 전이 후보 목록
                                            ↓
                               사용자 확인 (AutonomyLevel 1)
                                            ↓
               → [memory-organizer.execute] → coffaen_move 실행
                                            ↓
                               [index-invalidator hook] → stale-nodes 갱신
```

**오케스트레이터**: organize 스킬이 전체 흐름을 조율한다.
memory-organizer 에이전트를 순차적으로 judge → (확인) → execute 단계로 호출한다.

## 워크플로우

### Step 1 — judge 단계 (memory-organizer 위임)

`memory-organizer` 에이전트의 judge 모듈을 실행:
- Layer 3/4 파일 스캔
- 접근 빈도, 태그 매칭, 연결 밀도 평가
- TransitionDirective 목록 생성

### Step 2 — 후보 표시 및 사용자 확인

생성된 TransitionDirective를 표 형식으로 표시:

```
| 파일 | 현재 Layer | 목표 Layer | 이유 | 신뢰도 |
```

사용자가 "진행"을 입력하거나 개별 항목을 선택/제외할 수 있다.

### Step 3 — execute 단계 (memory-organizer 위임)

승인된 TransitionDirective에 대해 execute 모듈 실행:
- `coffaen_move` 호출
- Frontmatter `layer` 필드 갱신
- 링크 경로 갱신

### Step 4 — 결과 요약

실행된 전이 목록과 AgentExecutionResult 요약 출력.

## Available MCP Tools

| 도구 | 용도 |
|------|------|
| `kg_status` | vault 상태 및 stale-nodes 확인 |
| `kg_navigate` | 링크 관계 탐색 |
| `coffaen_move` | 파일 이동 실행 |
| `coffaen_update` | Frontmatter 갱신 |

## Options

```
/coffaen:organize [--dry-run] [--layer <3|4>] [--min-confidence <0.0-1.0>]
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--dry-run` | false | judge만 실행, execute 미실행 |
| `--layer` | 3,4 | 스캔 대상 Layer |
| `--min-confidence` | 0.7 | 최소 신뢰도 임계값 |
