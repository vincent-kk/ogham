# imbas-split

imbas 파이프라인 Phase 2. 검증된 문서를 INVEST 원칙에 따라 Jira Story로 분할한다.

## 개요

Phase 1(validate)에서 통과한 기획 문서를 `planner` 에이전트가 INVEST 원칙에 맞는 Story로 분할하고,
3→1→2 검증 체계로 품질을 확인한다. 크기가 초과되면 수평 분할, 개념적으로 하위 Story가 필요하면 우산 패턴을 적용한다.

## 사용법

```
/imbas:imbas-split [--run <run-id>] [--epic <EPIC-KEY>]

--run    : 기존 런 ID (생략 시 가장 최근 PASS/PASS_WITH_WARNINGS 런 사용)
--epic   : Epic Jira 키 (생략 시 Epic 생성/선택을 대화형으로 결정)
```

## 선행 조건

- `validate.status == "completed"`
- `validate.result`가 `"PASS"` 또는 `"PASS_WITH_WARNINGS"`

## 워크플로우

1. **Run 로드 및 사전조건 검증**
2. **Epic 결정** — `--epic` 지정, 기존 Epic 선택, 새 Epic 생성, 또는 없음
3. **`planner` 에이전트 실행** — INVEST 준수 Story 목록 생성 (User Story + AC 형식)
4. **3→1→2 검증** (Story별)
   - [3] 앵커 링크 확인 — 원본 문서 섹션 참조 존재 여부
   - [1] 일관성 확인 — 문서 목표와의 정합성
   - [2] 역추론 검증 — `analyst`가 Story를 재조합하여 원본과 비교
5. **이스케이프 조건 감지** — 필요 시 이스케이프 처리
6. **크기 확인** — 4가지 기준(범위, 명세 충분성, 독립성, 단일 책임) 초과 시 수평 분할
7. **stories-manifest.json 생성** — 검증 결과, 크기 확인, 리뷰 플래그 포함
8. **사용자 리뷰** — 승인 또는 수정 요청

## 이스케이프 코드

| 코드 | 의미 | 후속 조치 |
|------|------|-----------|
| **E2-1** | 정보 부족 | 누락 항목 목록, 보충 요청 |
| **E2-2** | 모순 발견 | 충돌 지점 명시, 인간 판단 요청 |
| **E2-3** | 분할 불필요 (이미 적절한 크기) | Phase 3(devplan)으로 직접 진행 가능 |
| **EC-1** | 이해 불가 | 범위 동결, 명확화 질의 구성 |
| **EC-2** | 원본 결함 발견 | 결함 보고서 생성, 재검증 권고 |

## 출력

- `stories-manifest.json` → `.imbas/<KEY>/runs/<run-id>/stories-manifest.json`

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `mcp_tools_run_get` | imbas MCP | 런 상태 로드 |
| `mcp_tools_run_transition` | imbas MCP | 단계 전이 (시작/완료/이스케이프) |
| `mcp_tools_manifest_save` | imbas MCP | stories-manifest 저장 |
| `mcp_tools_manifest_validate` | imbas MCP | 매니페스트 유효성 검증 |
| `[OP: get_issue]` | Jira ([OP:]) | Epic 존재 확인 |
| `planner` | 에이전트(sonnet) | INVEST Story 분할 |
| `analyst` | 에이전트(sonnet) | 역추론 검증 |

## 참고 파일

- `references/workflow.md` — 워크플로우 상세
- `references/preconditions.md` — 선행 조건
- `references/state-transitions.md` — 상태 전이
- `references/escape-conditions.md` — 이스케이프 코드 상세
- `references/errors.md` — 에러 처리
- `references/tools.md` — 사용 도구 상세
