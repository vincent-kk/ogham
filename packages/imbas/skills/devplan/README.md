# devplan

imbas 파이프라인 Phase 3. 승인된 Story를 기반으로 코드베이스를 탐색하여 EARS 형식의 Subtask를 생성하고, Story 간 중복을 감지하여 공통 Task를 추출한다.

## 개요

로컬 코드베이스를 실제로 분석하여 각 Story의 구현 계획(Subtask)을 만든다.
`imbas-engineer` 에이전트(opus)가 코드 탐색, Subtask 초안 작성, 중복 감지, Task 추출까지 수행하며,
최종 결과물은 `devplan-manifest.json`으로 Jira 일괄 생성에 사용된다.

## 선행 조건

- `split.status == "completed"` 이고 `split.pending_review == false`
- 또는 `split.status == "escaped"` 이고 `split.escape_code == "E2-3"`
- 모든 Story가 Jira에 생성 완료(`status: "created"`, `issue_ref` 존재)

## 워크플로우

1. **Run 로드 및 사전조건 검증** — state.json에서 split 단계 완료 확인
2. **imbas-engineer 에이전트 실행**
   - Story별 코드 탐색 (도메인 키워드 → 진입점 탐색)
   - Story별 EARS 형식 Subtask 초안 (종료 기준: 최대 200줄, 10파일, 리뷰 1시간, 단일 책임)
   - Story 간 중복 감지 → 공통 Task 추출 (blocks 링크 포함)
   - `devplan-manifest.json` 생성
3. **B→A 피드백 수집** — Story 정의와 코드 현실 사이의 괴리 기록
4. **사용자 리뷰** — 승인 또는 수정 요청

## AST 폴백

`imbas_ast_search`/`imbas_ast_analyze`에서 `sgLoadError` 발생 시:
- 메타변수를 정규식으로 변환하여 Grep 기반 검색으로 전환
- LLM이 오탐을 필터링하는 근사 모드로 계속 실행

## 출력

- `devplan-manifest.json` → `.imbas/<KEY>/runs/<run-id>/devplan-manifest.json`

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `imbas_run_get` | imbas MCP | 런 상태 로드 |
| `imbas_run_transition` | imbas MCP | 단계 시작/완료 전이 |
| `imbas_manifest_get` | imbas MCP | stories-manifest 로드 |
| `imbas_manifest_save` | imbas MCP | devplan-manifest 저장 |
| `imbas_manifest_validate` | imbas MCP | 매니페스트 유효성 검증 |
| `imbas_ast_search` | imbas MCP | AST 패턴 검색 |
| `imbas_ast_analyze` | imbas MCP | 의존성 그래프/복잡도 분석 |
| `imbas-engineer` | 에이전트(opus) | 코드 탐색 및 Subtask 생성 |

## 참고 파일

- `references/workflow.md` — 단계별 워크플로우 상세
- `references/preconditions.md` — 선행 조건
- `references/state-transitions.md` — 상태 전이 다이어그램
- `references/ast-fallback.md` — AST 폴백 로직
- `references/errors.md` — 에러 처리
- `references/tools.md` — 사용 도구 상세
