## Purpose

MCP 도구 컨테이너(1도구 1디렉토리). core/adapters를 얇게 오케스트레이션하는 결정론 계약 레이어.

## Conventions

- 설정이 필요한 조회 핸들러는 buildToolContext로 컨텍스트를 조립한다. 진단·설정 복구와 저장된 job 조회는 이를 전제하지 않아 복구 경로를 유지한다. 모든 핸들러는 wrapHandler로 감싼다.
- 입력 검증은 `types/tool.ts`의 zod 스키마(registerTool inputSchema 재사용).

## Boundaries

### Always do

- 도구는 core/adapters를 호출만 — 도메인 하드 규칙은 core 소관.
- annotations(readOnly·idempotent·destructive)를 정확히 표기.

### Ask first

- 새 도구 추가, 도구 I/O 계약 변경.

### Never do

- 핸들러에서 `fetch` 직접 호출. api_key 노출.
