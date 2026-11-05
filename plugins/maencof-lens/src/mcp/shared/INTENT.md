## Purpose

MCP 툴 응답 헬퍼. `toolResult`와 `toolError` 포맷터를 제공한다.

## Conventions

콜백마다 MCP content를 따로 조립하면 오류 표시가 갈라진다.

## Boundaries

### Always do

- 일반 결과와 오류 봉투의 구분을 이 모듈에서 통일한다.

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
