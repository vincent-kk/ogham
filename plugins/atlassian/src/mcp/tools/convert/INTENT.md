## Purpose

ADF / Storage / Markdown 포맷 간 변환을 수행하는 순수 로컬 MCP 툴 핸들러. HTTP 통신 없이 완전히 로컬에서 실행된다.

## Conventions

변환 실패는 실패 결과로 반환한다. 포맷 해석은 변환 계층이 소유하고 도구는 그 계약을 호출한다.

## Boundaries

### Always do

- 변환 로직은 `converter/index`에 위임한다 (`convert` 함수 경유)
- 오류를 예외로 전파하지 않고 `{ success: false, error }` 형태로 반환한다

### Ask first

- 지원 포맷(`ConvertFormat`) 추가 또는 제거
- 변환 결과 스키마(`ConvertResult`) 변경

### Never do

- 변환 알고리즘을 이 모듈에 직접 구현하지 않는다
- HTTP 요청 또는 파일 I/O를 수행하지 않는다
- Atlassian 도메인 지식(ADF 구조 세부사항 등)을 직접 다루지 않는다
