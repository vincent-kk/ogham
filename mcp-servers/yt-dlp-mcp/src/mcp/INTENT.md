## Purpose

MCP 서버 결선 계층. 도구 정의를 모아 enable 게이트에 따라 등록하고 서버 인스턴스를 만든다.

## Structure

| 파일/디렉터리    | 역할                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `index.ts`       | barrel: `TOOL_REGISTRY`·`isToolEnabled`·`registerEnabledTools`·`createServer`·`ToolDefinition`·`ToolDeps` 재노출 |
| `registry/`      | 도구 목록·게이트·등록 루프                                                                                       |
| `server/`        | 빈 `McpServer` 인스턴스 팩토리                                                                                   |
| `tools/` (organ) | `ToolDefinition` 도구 파일들 + 공용 `handleToolExecution` 래퍼 + `annotations`                                   |

## Conventions

- 각 도구는 `tools/`에서 `ToolDefinition`(`name`·`enabledBy`·`register`) 형태로 정의한다
- 각 도구는 `outputSchema`로 `structuredContent`의 출력 계약을 선언하고 SDK가 이를 검증한다
- 도구 핸들러는 공용 `handleToolExecution` 래퍼로 감싸 에러를 `[CODE]` 접두로 표면화한다
- `annotations`의 `READ_ONLY`/`WRITES_FILE`로 read-only·idempotent 힌트를 표기한다
- 도구 등록은 항상 `registry`의 게이트(`registerEnabledTools`)를 경유한다

## Boundaries

### Always do

- 도구는 `enabledBy` 게이트를 통해서만 등록한다
- 도구 실행 오류는 공용 핸들러로 표면화한다

### Ask first

- 새 도구 추가나 도구 활성화 정책 변경

### Never do

- 게이트를 우회해 무조건 등록한다
- 도구 핸들러에서 도메인 에러를 삼킨다

## Dependencies

- 내부: `registry/index`, `server/index`, `tools/tool-definition`; `registry`는 `features` 슬라이스 도구도 등록; 도구는 `core`(`Service` via `ToolDeps`)·`postprocess`·`domain` 사용
- 외부: `@modelcontextprotocol/sdk`(server 경유), `zod`(입·출력 스키마)
- 소비처: root
