# server — Contract

## Requirements

- 읽기 전용 툴 5개(`search`·`context`·`navigate`·`read`·`status`)만 등록한다. 툴 이름의 정본은 `constants/mcpToolNames.ts` 의 `McpToolName` 이고, mutation 핸들러는 등록하지 않는다 — 재색인은 maencof 세션의 몫이다.
- config 부재가 기동을 막지 않는다. `configRoot` 가 `null` 이거나 `loadConfig` 가 `null` 을 돌려주면 라우터 없이 서버를 만들고, 실패는 툴 호출 시점으로 미룬다.
- 그 실패 메시지는 두 원인을 구분한다: 호스트가 워크스페이스를 노출하지 않아 config 를 찾아보지도 못한 경우와, `configRoot` 아래에 `.maencof-lens/config.json` 이 없는 경우. 둘 다 복구 수단(`MAENCOF_LENS_CONFIG_ROOT`, `/maencof-lens:setup`)을 문장에 담는다.
- 볼트 해석의 단일 진입점은 `resolveVault` 다. 툴 콜백이 `VaultRouter` 를 직접 만지지 않는다.
- `GraphCache` 는 서버 인스턴스당 하나다. 툴 콜백은 캐시를 새로 만들지 않고 `graphCache.getGraph(vault.path)` 로만 그래프를 얻는다.
- 핸들러 예외가 MCP 밖으로 새지 않는다. 모든 툴 콜백이 `try`/`catch` 로 감싸 `toolError` 로 변환한다.
- `layer_filter` 를 입력으로 받는 툴은 `search`·`context` 둘뿐이다. `navigate`·`read`·`status` 스키마에는 그 필드가 없고, 유효 레이어는 볼트 설정 상한(기본 L2–L5)이 된다.
- 응답 조립은 `mcp/shared` 의 `toolResult`·`toolError` 만 쓴다. 콜백이 MCP content 배열을 손으로 만들지 않는다.

## API Contracts

- `createLensServer(configRoot: string | null): McpServer` — 5개 툴이 등록된 서버 인스턴스. `configRoot` 는 `.maencof-lens/` 를 담은 디렉터리의 절대 경로이거나 `null`. config 를 못 찾아도 throw 하지 않는다.
- 등록 툴과 필수 입력: `search(seed: string[], 최소 1개)` · `context(query: string)` · `navigate(path: string)` · `read(path: string)` · `status()`. 다섯 툴 모두 optional `vault`(볼트 이름)를 받는다.
- `search`·`context` 의 `layer_filter` 는 볼트 상한과 교집합되며, 교집합이 비면 에러 없이 상한 전체로 되돌아간다.
- `read` 만 핸들러 결과의 `error` 필드를 `isError` 응답으로 승격한다. `search`·`context`·`navigate` 는 핸들러가 만든 `error` 페이로드를 정상 결과 본문으로 돌려준다.
- 서버 이름은 `maencof-lens`, 버전은 `version.ts` 의 `VERSION` 이다.

## Acceptance Criteria

### AC-tool-registry — 툴 등록 범위

- 등록되는 툴이 정확히 5개이고, 이름이 `McpToolName` 값과 일치한다.
- mutation·재색인 계열 툴이 등록되지 않는다.

### AC-missing-config-deferred — config 부재 지연 처리

- `configRoot` 가 `null` 이어도 `createLensServer` 가 서버를 반환한다.
- 그 상태에서 툴을 호출하면 워크스페이스 미노출 원인을 지목한 에러가 나온다.
- `configRoot` 는 있으나 config 파일이 없으면 그 경로를 담은 다른 문장이 나온다.

### AC-error-envelope — 에러 봉투

- 툴 콜백에서 던져진 예외가 `toolError` 응답으로 변환되어 서버 밖으로 전파되지 않는다.
- `read` 의 레이어 차단 결과가 `isError` 로 표시된다.

### AC-single-graph-cache — 그래프 캐시 단일화

- 다섯 툴이 같은 `GraphCache` 인스턴스를 통해 그래프를 얻는다.
- 볼트 경로가 같으면 툴 호출마다 그래프를 다시 로드하지 않는다.

## Last Updated

2026-07-30 — 툴 등록 범위, config 부재 지연 처리, 에러 봉투 계약을 문서화했다.
