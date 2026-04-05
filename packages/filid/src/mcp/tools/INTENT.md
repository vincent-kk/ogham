# tools -- MCP 도구 핸들러

## Purpose

16개 FCA-AI MCP 도구의 비즈니스 로직 핸들러를 구현한다. `server.ts`에서 등록되어 MCP 프로토콜을 통해 호출된다.

## Structure

각 도구는 독립 모듈로 구성. `handle*` 함수를 export한다.

## Boundaries

### Always do
- 도구 응답: `toolResult()`/`toolError()` 래퍼 사용
- Zod 스키마로 입력 검증

### Ask first
- 기존 도구 입력 스키마 변경

### Never do
- 도구 간 직접 의존 (fractal 내부 organ 예외)

## Dependencies
- `../../core/`, `../../ast/`, `../../metrics/`, `../../compress/`, `../../types/`
