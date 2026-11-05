## Purpose

5개 MCP 읽기 전용 툴 핸들러 모듈. maencof 핸들러를 래핑하여 레이어 필터링을 적용한다.

## Conventions

- maencof의 검색·조합 의미를 재구현하지 않고 어댑터가 볼트 상한과 오류 표면을 맡는다. 두 구현의 의미가 갈라지는 것을 막는다.

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
