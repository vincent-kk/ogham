# server — Contract

## Requirements

- MCP 서버 인스턴스를 만들고 도구 9개를 등록한다. 등록표가 이 fractal 의 전부이며 비즈니스 로직은 두지 않는다.
- 등록은 `server.registerTool()` 만 쓴다. 도구별 특수 등록 경로를 만들지 않는다 — 핸들러 시그니처를 우회하면 등록표가 더 이상 표면의 정본이 아니게 된다.
- 도구 스키마의 `description` 이 계약 정본이다. 호출자는 그 문장만 보고 인자를 고른다.
- 설정을 쓰는 도구는 `scope` 를 필수로 노출하고, 두 계층이 무엇을 뜻하는지 `description` 에 적는다. `project` 는 `<cwd>/.imbas/config.json`(워크스페이스별, user 재정의), `user` 는 모든 워크스페이스가 상속하는 전역 설정이며 어느 쪽도 기본값이 되지 않는다.

## API Contracts

```typescript
export { createServer, startServer } from './server.js';
```

- `createServer` 는 도구가 모두 등록된 `McpServer` 인스턴스를 반환한다.
- `startServer` 는 전송 계층을 붙여 서버를 기동한다. 전송 선택 자체는 `serverEntry/` 가 결정한다.
- 등록되는 도구 이름은 `constants/mcpToolNames.ts` 의 `MCP_TOOL_NAMES` 와 정확히 일치한다.
- 각 도구의 핸들러는 `../tools/` 배럴에서 온다. `server.ts` 는 핸들러 구현을 알지 못한다.

## Acceptance Criteria

### AC-server-nine-registrations — 등록 수 9

- `server.ts` 의 `registerTool` 호출 수가 9다.
- 등록된 도구 이름 집합이 `MCP_TOOL_NAMES` 와 같다.

### AC-server-register-only — 등록 API 단일화

- `server/**` 에 `server.tool(` 호출이 없다.

### AC-server-scope-required — scope 필수 노출

- `config_set` 의 inputSchema 에서 `scope` 가 optional 이 아니다.
- `config_set` 의 `description` 에 `project` 와 `user` 가 모두 언급된다.

### AC-server-no-logic — 로직 부재

- `server/**` 가 `core/` 의 비즈니스 함수를 직접 호출하지 않는다 — 호출은 `tools/` 핸들러의 몫이다.

## Last Updated

2026-08-06 — 도구 9개 등록표와 `scope` 필수 노출 규칙을 최초 문서화했다.
