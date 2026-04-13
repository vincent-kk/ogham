# transition-history

## Purpose

Layer 간 문서 전이(TransitionDirective) 이력을 영속화하고 조회하는 모듈. `.maencof-meta/transition-history.json`에 최대 500건 저장.

## Structure

- `transition-history.ts` — appendTransition, readTransitionHistory, getRejectCount
- `index.ts` — barrel export

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
