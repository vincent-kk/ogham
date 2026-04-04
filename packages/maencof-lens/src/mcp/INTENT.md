## Purpose

MCP 서버 설정 모듈. 서버 팩토리, stdio 진입점, 응답 헬퍼를 포함한다.

## Structure

- `server/` — MCP 서버 팩토리 (5개 읽기 전용 툴 등록)
- `server-entry/` — esbuild 진입점 (stdio 트랜스포트)
- `shared/` — 툴 응답 포맷터 (toolResult, toolError)

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
