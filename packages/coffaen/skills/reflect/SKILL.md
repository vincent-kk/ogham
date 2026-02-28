---
name: reflect
user_invocable: true
description: memory-organizer judge 모듈 읽기 전용 분석 — 전이 후보 및 중복 감지 보고
version: 1.0.0
complexity: medium
context_layers: [1, 2, 3, 4]
orchestrator: reflect 스킬
plugin: coffaen
---

# reflect — 지식 저장소 분석 리포트

memory-organizer의 **judge 모듈만** 실행하여 전이 후보와 중복 문서를 분석한다.
파일시스템 변경 없이 순수 분석 보고서를 생성한다.

## When to Use This Skill

- 지식 저장소 현황을 파악하고 싶을 때 (변경 없이)
- 어떤 문서가 전이 후보인지 사전 검토할 때
- 중복 문서 탐지 결과만 보고 싶을 때
- "반성", "지식 현황", "전이 후보 확인"

## 에이전트 협업 시퀀스

```
[reflect 스킬] → [memory-organizer.judge] → TransitionDirective[]
                                          ↓
                              분석 보고서 생성 (파일 변경 없음)
```

**오케스트레이터**: reflect 스킬이 judge 모듈만 호출하고 execute는 건너뛴다.
`/coffaen:organize --dry-run`과 동일하지만 더 상세한 보고서를 생성한다.

## 워크플로우

### Step 1 — vault 상태 조회

`kg_status`로 현재 인덱스 상태, 노드 수, stale 노드 목록 조회.

### Step 2 — judge 모듈 실행

memory-organizer judge 로직 수행:
- Layer 3/4 전체 스캔
- 각 노드 전이 점수 계산 (접근 빈도, 태그, 연결 밀도, confidence)
- 중복 후보 쌍 탐지

### Step 3 — 보고서 생성

```markdown
## 지식 저장소 분석 보고서

### 전이 후보 (Layer 3 → Layer 2)
| 파일 | 접근 횟수 | 태그 매칭 | confidence | 권장 |
|------|---------|---------|-----------|------|

### 전이 후보 (Layer 4 → Layer 3)
| 파일 | 마지막 접근 | 만료일 | 권장 |

### 중복 탐지
| 파일 A | 파일 B | 공통 태그 | 유사도 |

### 요약
- 전이 후보: N개
- 중복 문서 쌍: N개
- 권장 액션: /coffaen:organize 실행
```

## Available MCP Tools

| 도구 | 용도 |
|------|------|
| `kg_status` | vault 상태 조회 |
| `kg_navigate` | 링크 관계 탐색 |
| `coffaen_read` | 문서 Frontmatter 조회 |

## Options

```
/coffaen:reflect [--layer <1-4>] [--show-all]
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--layer` | 3,4 | 분석 대상 Layer |
| `--show-all` | false | confidence 무관 전체 후보 표시 |
