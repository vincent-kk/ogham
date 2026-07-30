# server — Contract

## Requirements

- 서버 이름은 `'tools'` 로 고정한다 — `.mcp.json` 등록명과 일치해야 도구 이름이 해석된다.
- 도구 4종(`run_r`·`get_r_job`·`cancel_r_job`·`assert_analysis_plan`)을 zod 스키마와 함께 등록하며, 모든 콜백은 `wrapHandler` 로 감싼다.
- 기동은 stdio transport 만 사용한다. stdout 은 프로토콜 채널이므로 로그는 stderr 로만 쓴다.
- 기동 전 만료 워크스페이스를 정리하고, 종료 시 실행 중 잡을 모두 취소한다. 종료 훅은 한 번만 등록한다.
- 핸들러에서 `process.exit` 를 직접 호출하지 않는다 — 프로세스 종료는 진입점 소관이다.

## API Contracts

- `createServer(): McpServer` — 이름 `'tools'` 인 서버를 만들고 도구 4개를 등록해 돌려준다.
- `startServer(): Promise<void>` — 만료 워크스페이스 prune 후 stdio 로 연결한다.
- `registerShutdown(): void` — 종료 시 `cancelAllJobs` 를 부르는 훅을 1회 등록한다(모듈 내부 소비).

## Acceptance Criteria

### AC-server-registration — 등록 규약

- 등록된 도구가 정확히 4개이며 이름이 snake_case 로 `.mcp.json` 계약과 일치한다.
- 모든 `registerTool` 콜백이 `wrapHandler` 를 거친다.

### AC-server-lifecycle — 수명주기

- 기동 경로는 stdio 하나뿐이고 stdout 직접 쓰기가 없다.
- 종료 시 살아 있는 잡이 모두 취소된다.

## Last Updated

2026-07-30 — 서버 등록·수명주기 계약을 문서화했다.
