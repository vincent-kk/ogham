# server — Contract

## Requirements

- MCP 서버 인스턴스를 만들고 도구 9개를 등록한다. 등록표가 이 fractal 의 전부이며 비즈니스 로직은 두지 않는다.
- 등록은 `server.registerTool()` 만 쓴다. 도구별 특수 등록 경로를 만들지 않는다 — 핸들러 시그니처를 우회하면 등록표가 더 이상 표면의 정본이 아니게 된다.
- 도구 스키마의 `description` 이 계약 정본이다. 호출자는 그 문장만 보고 인자를 고른다.
- 설정을 쓰는 도구는 `scope` 를 필수로 노출하고, 두 계층이 무엇을 뜻하는지 `description` 에 적는다. `project` 는 `<cwd>/.imbas/config.json`(워크스페이스별, user 재정의), `user` 는 모든 워크스페이스가 상속하는 전역 설정이며 어느 쪽도 기본값이 되지 않는다.

## API Contracts

- 등록표가 도구 표면의 정본이다. 도구 이름 상수와 등록을 함께 유지하고 핸들러 구현은 도구 계층에 맡긴다.

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

도구 등록·전송·서버 수명 계약의 내용과 근거가 바뀔 때 갱신한다.
