# serverEntry — Contract

## Requirements

- 실행 진입점이지 라이브러리가 아니다. `bridge/mcp-server.cjs` 로 번들되어 호스트가 프로세스로 띄우며, 배럴 `index.ts` 는 이름을 하나도 내보내지 않는다(`export {} from "./serverEntry.js"`) — 이 fractal 의 표면은 심볼이 아니라 실행이다.
- config 루트 해석 경로는 둘뿐이다: `MAENCOF_LENS_CONFIG_ROOT` 환경변수, 그다음 `@ogham/cross-platform/host-paths` 의 `tryProjectRoot()`.
- `process.cwd()` 로 폴백하지 않는다 — MCP 서버의 cwd 는 플러그인 설치 경로일 수 있어 남의 디렉터리를 워크스페이스로 오인한다.
- 둘 다 해석되지 않으면 `null` 을 그대로 `createLensServer` 에 넘기고 기동한다. 진입점은 config 부재를 기동 실패로 바꾸지 않는다 — 사용자는 툴 호출 시점에 복구 안내를 받는다.
- 진단 문자열은 stderr 로만 쓴다. stdout 은 MCP 프로토콜 전용이라 한 줄이라도 섞이면 세션이 깨진다.
- 기동 실패는 조용히 끝나지 않는다. `main()` 의 rejection 을 잡아 stderr 한 줄을 남기고 exit code 1 로 종료한다.
- 볼트에 쓰지 않는다 — 이 진입점이 하는 일은 config 루트 해석과 트랜스포트 연결뿐이다.

## API Contracts

- 모듈 진입점: `serverEntry.ts` 의 top-level `main()` 실행. export 는 없고 import 하면 서버 기동이 side effect 로 일어난다.
- 환경변수 `MAENCOF_LENS_CONFIG_ROOT` — `.maencof-lens/` 를 담은 디렉터리의 절대 경로. 설정되면 `tryProjectRoot()` 보다 우선한다.
- 트랜스포트는 `StdioServerTransport` 고정이다.
- 실패 출력: stderr 에 `maencof-lens MCP server error: <원인>` 한 줄, 종료 코드 1.

## Acceptance Criteria

### AC-config-root-order — 해석 우선순위

- 환경변수가 설정되어 있으면 그 값이 쓰인다.
- 환경변수가 없으면 `tryProjectRoot()` 결과가 쓰인다.
- 어느 경로에서도 `process.cwd()` 가 config 루트로 쓰이지 않는다.

### AC-startup-not-blocked — 미해석 시 기동

- config 루트가 `null` 이어도 서버가 기동하고 트랜스포트에 연결된다.
- 기동 단계에서 config 부재를 이유로 종료하지 않는다.

### AC-stdout-protocol-only — stdout 오염 금지

- 정상 경로와 실패 경로 모두 stdout 에 진단 문자열을 쓰지 않는다.
- 기동 실패 시 stderr 출력과 exit code 1 이 함께 관측된다.

## Last Updated

2026-07-30 — config 루트 해석 순서와 기동 실패 계약을 문서화했다.
