# imbas-validate

imbas 파이프라인 Phase 1. 기획 문서의 모순, 괴리, 누락, 논리적 불가능성을 검증한다.

## 개요

기획 문서(로컬 마크다운 또는 Confluence 페이지)를 `analyst` 에이전트가 5가지 관점에서 검증하여
마크다운 검증 보고서를 생성한다. 결과에 따라 다음 단계(split) 진행 여부가 결정된다.

## 사용법

```
/imbas:imbas-validate <source> [--project <KEY>] [--supplements <path,...>]

<source>       : 기획 문서 경로 (로컬 md/txt) 또는 Confluence URL
--project      : Jira 프로젝트 키 (config 오버라이드)
--supplements  : 보충 자료 경로 (쉼표 구분)
```

## 5가지 검증 유형

| 유형 | 설명 |
|------|------|
| **모순 (Contradictions)** | 문서 내 상충되는 요구사항 |
| **괴리 (Divergences)** | 목표와 세부사항 간 불일치 |
| **누락 (Omissions)** | 언급되었으나 정의되지 않은 항목 |
| **불가능성 (Infeasibilities)** | 기술적/논리적으로 실현 불가능한 요구사항 |
| **테스트 가능성 (Testability)** | 측정 가능한 수용 기준이 없는 요구사항 |

각 이슈는 **BLOCKING** 또는 **WARNING**으로 분류된다.

## 결과 판정

| 결과 | 조건 | 다음 단계 |
|------|------|-----------|
| **PASS** | BLOCKING 0건, WARNING 0건 | split 진행 가능 |
| **PASS_WITH_WARNINGS** | BLOCKING 0건, WARNING 1건 이상 | split 진행 가능 (경고 표시) |
| **BLOCKED** | BLOCKING 1건 이상 | split 진행 불가 |

## 워크플로우

1. **런 초기화** — config 로드, 프로젝트 결정, 런 디렉토리 생성, 소스 복사
2. **문서 소스 해석** — 로컬 파일 또는 Confluence URL에서 마크다운 확보
3. **`analyst` 에이전트 실행** — 5가지 검증 수행, `validation-report.md` 작성
4. **결과 판정 게이트** — 보고서 파싱, PASS/PASS_WITH_WARNINGS/BLOCKED 결정
5. **상태 업데이트** — 런 상태 전이, 결과 요약 및 다음 단계 안내

## 출력

- `validation-report.md` → `.imbas/<KEY>/runs/<run-id>/validation-report.md`

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `mcp_tools_run_create` | imbas MCP | 런 디렉토리 생성, 소스 복사, state.json 초기화 |
| `mcp_tools_run_get` | imbas MCP | 런 상태 읽기 |
| `mcp_tools_run_transition` | imbas MCP | 단계 전이 (시작/완료) |
| `[OP: get_confluence]` | Jira ([OP:]) | Confluence 페이지 조회 |
| `[OP: search_confluence]` | Jira ([OP:]) | 참조 문서 검색 |
| `analyst` | 에이전트(sonnet) | 5가지 검증 수행 |

## 참고 파일

- `references/workflow.md` — 워크플로우 상세
- `references/state-transitions.md` — 상태 전이
- `references/errors.md` — 에러 처리
- `references/tools.md` — 사용 도구 상세
