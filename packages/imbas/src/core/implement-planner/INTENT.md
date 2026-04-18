# implement-planner

## Purpose

Story와 cross-story Task를 DAG로 해석해 병렬 가능한 그룹과 실행 순서를 계산한다.
의존성은 StoryLink(blocks/is-blocked-by)와 devplan Task.blocks에서 수집한다.

## Structure

- `implement-planner.ts` — buildImplementPlan() 메인 오케스트레이션
- `dependency-collector.ts` — stories/devplan에서 노드와 edge 추출
- `topo-leveler.ts` — Kahn topological sort + cycle 해소 + level 기반 그룹화
- `report-renderer.ts` — 사람이 읽는 markdown 리포트 생성

## Boundaries

### Always do

- 입력 manifest 불변 유지 (복사 후 계산)
- Subtask는 대상에서 제외 (Story, Task만 노드)
- cycle 발견 시 결정적으로 해소하고 cycles_broken에 기록

### Ask first

- max_parallel 정책 변경
- edge source 종류 추가

### Never do

- stories-only 모드에서 devplan 참조
- manifest 파일 직접 I/O (manifest-parser 경유)
