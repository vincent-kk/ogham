# transitionHistory

## Purpose

Layer 간 문서 전이(TransitionDirective) 이력을 영속화하고 조회하는 모듈. `.maencof-meta/transition-history.json`에 최대 500건 저장.

## Conventions

전이 기록은 상한이 있는 FIFO 진단 자료다. 보존 건수와 포맷은 별도 결정하여 이력 소비자의 판단 기준을 유지한다.

## Boundaries

### Always do

- FIFO 방식으로 500건 초과 시 오래된 항목 제거
- types/agent.ts의 TransitionHistoryEntry 타입 사용

### Ask first

- 최대 이력 건수 변경
- 이력 데이터 포맷 변경

### Never do

- 이력 파일 경로 하드코딩
- mcp/ 또는 hooks/ 직접 의존
