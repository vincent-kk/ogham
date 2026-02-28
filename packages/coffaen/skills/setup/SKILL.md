---
name: setup
user_invocable: true
description: coffaen 온보딩 위저드 — Core Identity 수집 + 지식 트리 초기화 (6단계)
version: 1.0.0
complexity: complex
context_layers: [1]
orchestrator: setup 스킬
plugin: coffaen
---

# setup — coffaen 온보딩 위저드

coffaen을 처음 사용하거나 Core Identity를 재설정할 때 실행하는 6단계 인터뷰형 위저드.
한 번에 하나의 질문만 제시하며, 모든 단계는 건너뛸 수 있다.

## When to Use This Skill

- coffaen을 처음 설치한 직후
- Core Identity(가치관, 경계, 선호)를 업데이트하고 싶을 때 (`--step` 옵션으로 특정 단계 재실행)
- 지식 트리 경로를 변경해야 할 때
- Progressive Autonomy Level을 수동으로 재설정할 때

## 6단계 위저드 플로우

### Stage 1 — 환영 + 기억공간 경로 설정

AskUserQuestion으로 vault 절대 경로를 수집한다.
- 기본값: `~/.coffaen/`
- 경로가 존재하지 않으면 생성 여부 확인
- `.coffaen/` 캐시 디렉토리, `.coffaen-meta/` 메타 디렉토리도 함께 생성

### Stage 2 — Core Identity 인터뷰 (최소 5개)

AskUserQuestion으로 순차적으로 질문한다. 각 질문은 독립적이며 "나중에"로 건너뛸 수 있다.

필수 세트 (5개):
1. 이름/호칭 — "어떻게 불러드릴까요?"
2. 핵심 가치관 3가지 — "당신에게 가장 중요한 가치관 3가지는 무엇인가요?"
3. 절대 경계 1가지 — "절대로 해서는 안 되는 것 한 가지를 알려주세요."
4. 주요 관심사 — "현재 가장 관심 있는 분야나 프로젝트는 무엇인가요?"
5. 커뮤니케이션 스타일 — "어떤 방식의 소통을 선호하시나요?"

선택 세트 (5개, 필수 완료 후 제안):
6. 직업/역할 | 7. 장기 목표 | 8. 학습 스타일 | 9. 의사결정 기준 | 10. 일상 루틴

### Stage 3 — 초기 지식 트리 스캐폴딩

수집된 인터뷰 답변으로 Layer 1 문서를 생성한다:

| 파일 | 내용 |
|------|------|
| `01_Core/identity.md` | 이름, 호칭, 정체성 |
| `01_Core/values.md` | 핵심 가치관 |
| `01_Core/boundaries.md` | 절대 경계 |
| `01_Core/preferences.md` | 커뮤니케이션 선호 |
| `01_Core/trust-level.json` | Level 0 초기화 |

`coffaen_create` MCP 도구로 각 문서를 생성한다 (layer=1, tags 필수).

또한 `02_Derived/`, `03_External/`, `04_Action/` 디렉토리를 생성한다.

identity-guardian 에이전트에게 생성된 L1 문서의 Frontmatter 규칙 준수를 coffaen_read로 확인하도록 위임한다.

### Stage 4 — Progressive Autonomy Level 0 설정

`01_Core/trust-level.json`을 Level 0으로 초기화:
```json
{
  "current_level": 0,
  "interaction_count": 0,
  "success_count": 0,
  "last_escalation_date": null,
  "lock_status": false
}
```

### Stage 5 — 초기 인덱스 빌드

`kg_status` MCP 도구로 인덱스 상태를 확인한다.
- 기존 마크다운 저장소가 있는 경우: 전체 빌드를 제안하고 사용자 확인 후 `/coffaen:build` 실행
- 신규인 경우: 생성된 L1 문서로 경량 빌드 실행

### Stage 6 — 첫 번째 기억 기록 가이드

완료 메시지와 함께 다음을 안내한다:
- `/coffaen:remember` — 새 지식 기록
- `/coffaen:recall` — 과거 지식 검색
- `/coffaen:build` — 인덱스 전체 구축
- `/coffaen:doctor` — 시스템 상태 점검

## 에이전트 협업

```
setup 스킬 시작
  -> Stage 3에서 identity-guardian 에이전트: L1 문서 생성 후 검토/보호
  -> Stage 5에서 build 스킬 호출 (사용자 승인 시)
  -> setup 스킬: 완료 요약 및 가이드 제공
```

## Available MCP Tools

| 도구 | 용도 |
|------|------|
| `coffaen_create` | L1 문서 생성 |
| `coffaen_read` | 기존 L1 문서 확인 |
| `kg_status` | 인덱스 상태 확인 |

## Options

```
/coffaen:setup [--step <stage>] [--reset]
```

| 옵션 | 설명 |
|------|------|
| `--step <1-6>` | 특정 단계만 재실행 |
| `--reset` | 전체 초기화 (기존 L1 문서 보존) |

## 수용 기준

- `01_Core/` 4개 문서 + `trust-level.json` 생성
- `02_Derived/`, `03_External/`, `04_Action/` 디렉토리 생성
- Progressive Autonomy Level 0 설정
- 건너뛰기 응답 허용 (모든 단계)
