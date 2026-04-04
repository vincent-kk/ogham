## Purpose

5개 MCP 읽기 전용 툴 핸들러 모듈. maencof 핸들러를 래핑하여 레이어 필터링을 적용한다.

## Structure

- `lens-context/` — 토큰 예산 기반 컨텍스트 조합
- `lens-navigate/` — 그래프 이웃 탐색
- `lens-read/` — 단일 문서 읽기
- `lens-search/` — Spreading Activation 검색
- `lens-status/` — 인덱스 상태 확인

## Boundaries

### Always do

- 모든 핸들러에 레이어 필터링을 적용한다
- maencof 핸들러를 직접 래핑한다

### Ask first

- 새로운 툴 핸들러 추가
- 핸들러 시그니처 변경

### Never do

- 순환 의존성 도입
- mutation 핸들러 호출
