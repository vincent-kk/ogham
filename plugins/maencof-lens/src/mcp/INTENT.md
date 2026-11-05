## Purpose

MCP 서버 설정 모듈. 서버 팩토리, stdio 진입점, 응답 헬퍼를 포함한다.

## Conventions

- 프로토콜 연결과 응답 봉투를 소유하고 실제 조회는 핸들러에 위임한다. 예외는 공통 오류 포맷으로 바꾸어 프로토콜 밖으로 새지 않게 한다.

## Boundaries

### Always do

- 모든 툴에 레이어 가드를 적용한다
- 에러 시 toolError 포맷으로 반환한다

### Ask first

- 읽기 전용 5개 툴 외 새 MCP 툴 추가
- 툴 파라미터 스키마 변경

### Never do

- 순환 의존성 도입
- mutation 핸들러 호출
