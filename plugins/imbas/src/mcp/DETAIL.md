# mcp — Contract

## Requirements

- MCP 표면은 도구 9개로 고정한다: `run_create` · `run_get` · `run_transition` · `run_list` · `manifest_save` · `manifest_validate` · `config_get` · `config_set` · `open_settings`. 이름의 정본은 `constants/mcpToolNames.ts` 다.
- 도구 등록은 `server.registerTool()` 만 쓴다. `server.tool()` 4-arg 패턴은 스키마를 위치 인자로 받아 등록표를 읽기 어렵게 만든다.
- 도구 `description` 은 1문장이다. 호출자는 이 문장만 보고 인자를 고르므로, 길이는 런타임 컨텍스트 비용이자 계약 명료성이다.
- 파일 I/O 래퍼 도구를 되살리지 않는다. 산출물 파일은 스킬이 Read/Write 로 직접 다룬다.

## API Contracts

- `mcp/index.ts` 배럴이 노출하는 심볼:
  - `server/` 에서 `createServer` · `startServer`
  - `shared/` 에서 `toolResult` · `toolError` · `mapReplacer` · `wrapHandler`
  - `tools/` 에서 9개 핸들러 `handleRunCreate` · `handleRunGet` · `handleRunTransition` · `handleRunList` · `handleManifestSave` · `handleManifestValidate` · `handleConfigGet` · `handleConfigSet` · `handleOpenSettings`
- `src/index.ts` 는 이 배럴을 재노출하지 않는다. `server/server.ts` 가 `version.ts` 를 참조하므로 재노출은 `src → mcp → mcp/server → src` 순환이 된다.
- 배송 진입점은 `serverEntry/` 이고 `pages/` 는 런타임 export 가 없는 정적 자산 루트다. 둘 다 이 배럴로 나가지 않는다.
- 자식 fractal 역할: `server/`(생성·등록) · `serverEntry/`(stdio 전송) · `shared/`(응답 형식) · `tools/`(핸들러) · `pages/`(정적 자산).

## Acceptance Criteria

### AC-mcp-tool-count-nine — 도구 표면 9개

- `constants/mcpToolNames.ts` 의 `MCP_TOOL_NAMES` 길이가 9다.
- `mcp/tools/index.ts` 가 노출하는 핸들러 수가 9다.

### AC-mcp-register-pattern — 등록 패턴 단일화

- `mcp/**` 에 `server.tool(` 호출이 없다.

### AC-mcp-barrel-named — 배럴 명시 재노출

- `mcp/index.ts` 에 `export *` 형태가 없다.
- `mcp/index.ts` 가 `serverEntry/` 와 `pages/` 를 재노출하지 않는다.

### AC-mcp-no-src-cycle — src 순환 부재

- `src/index.ts` 가 `mcp/` 를 재노출하지 않는다.
- `mcp/` 를 지나는 의존성 순환이 0건이다.

## Last Updated

2026-08-06 — MCP 도구를 17개에서 9개로 줄인 v2 표면과 배럴 경계를 최초 문서화했다.
