# tools — Contract

## Requirements

- 도구 핸들러 9개를 보유한다. 각 핸들러는 `core/` 에 위임하는 thin wrapper 이고 비즈니스 로직을 직접 구현하지 않는다.
- 도구 9개 전부(`run*` · `manifest*` · `config*` · `open_settings`)가 선택 인자 `project_root`(절대경로)를 받아 `projectRoot(input.project_root)` 로 워크스페이스를 해석한다. `process.cwd()` 직접 호출은 플러그인 설치 디렉터리에서 서버를 띄우는 호스트에서 엉뚱한 경로를 가리킨다.
- Claude Code 에서는 `project_root` 를 생략한다 — 서버가 워크스페이스에서 실행되므로 `process.cwd()` 와 같다. 설치 디렉터리에서 띄우는 호스트에서는 필수이며, 없으면 해석 실패로 throw 한다.
- 핸들러는 `toolResult` · `toolError` 를 직접 부르지 않는다. `wrapHandler` 가 처리한다.
- 새 핸들러를 더할 때 `server.ts` 등록도 같은 변경에서 수행한다. 등록되지 않은 핸들러는 도구 표면에 없는 죽은 코드다.

## API Contracts

`index.ts` 배럴이 노출하는 핸들러 9개와 대응 도구 이름:

| 핸들러                   | 도구                | 위임 대상                |
| ------------------------ | ------------------- | ------------------------ |
| `handleRunCreate`        | `run_create`        | `core` 상태·경로·ID      |
| `handleRunGet`           | `run_get`           | `core/stateManager`      |
| `handleRunTransition`    | `run_transition`    | `core/stateManager`      |
| `handleRunList`          | `run_list`          | `core/paths`             |
| `handleManifestSave`     | `manifest_save`     | `core` 매니페스트 쓰기   |
| `handleManifestValidate` | `manifest_validate` | `core/manifestValidator` |
| `handleConfigGet`        | `config_get`        | `core/configManager`     |
| `handleConfigSet`        | `config_set`        | `core/configManager`     |
| `handleOpenSettings`     | `open_settings`     | `openSettings/webServer` |

- 각 핸들러는 단일 async 함수로 export 되며, 자식 fractal 의 `index.ts` 배럴을 통해서만 이 배럴에 도달한다.
- `openSettings/` 는 자체 HTTP 서버(`webServer/`)를 가진 유일한 도구다. 나머지는 파일과 스키마만 다룬다.

## Acceptance Criteria

### AC-tools-nine-handlers — 핸들러 9개

- `tools/index.ts` 가 노출하는 심볼 수가 9이고 모두 `handle` 로 시작한다.
- 각 핸들러가 `MCP_TOOL_NAMES` 의 도구 하나에 대응한다.

### AC-tools-project-root-resolution — 워크스페이스 해석

- `tools/**` 에 `process.cwd()` 직접 호출이 없다.
- `server.ts` 의 9개 등록 전부가 inputSchema 에 `project_root` 를 optional 로 선언한다.

### AC-tools-thin-wrapper — 위임 유지

- 각 핸들러 파일이 `core/` 또는 자신의 자식 fractal 에 위임하며 상태 전이·스키마 검증을 자체 구현하지 않는다.

### AC-tools-no-direct-response — 응답 형식 위임

- `tools/**` 에 `toolResult(` · `toolError(` 직접 호출이 없다.

### AC-tools-registered — 등록 일치

- `tools/index.ts` 가 노출하는 모든 핸들러가 `server.ts` 에서 등록된다.

## Last Updated

2026-08-06 — v2 에서 9개로 줄어든 핸들러 표면과 `project_root` 해석 규칙을 최초 문서화했다.
