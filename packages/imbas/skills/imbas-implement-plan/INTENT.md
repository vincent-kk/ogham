# imbas-implement-plan

## Purpose
DAG 기반 구현 일정(병렬 그룹 + 순서)을 생성하는 사용자 호출 스킬. Stories와 cross-story Task 의존성을 topological level로 변환해 batch-plan manifest와 markdown 리포트를 산출한다.

## Structure

- `SKILL.md` — Tier-2 스킬 메인 프롬프트
- `README.md` — 사용자용 설명
- `references/` — 상세 참조 (workflow, preconditions, schema, state-transitions, errors)

## Boundaries

### Always do

- `mcp_tools_manifest_implement_plan` 호출로 위임 (MCP 도구가 로직 수행)
- 성공 후 `Implement plan generated` 또는 `Implement plan BLOCKED` 마커 emit
- cycles_broken/unresolved는 리포트만 하고 중단하지 않음

### Ask first

- 실패 시 (Phase 전제 미충족 등) 재시도 여부
- max_parallel 정책 변경

### Never do

- 매니페스트 내용 수동 수정
- Jira/GitHub 이슈 생성
- stories/devplan 매니페스트 재생성
