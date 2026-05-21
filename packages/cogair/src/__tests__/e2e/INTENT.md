## Purpose

cogair 의 MCP 서버 (3 도구) 와 라이프사이클 hook (2개) 의 회귀를 두 레이어로 보장. Layer A 는 in-process payload·envelope shape, Layer B 는 번들 stdio 실행 라이프사이클.

## Structure

| Directory   | Role                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| `helpers/`  | fake CLI, MCP 클라이언트 래퍼, hook runner, HTTP 클라이언트, 디스크 어설션 |
| `fixtures/` | config.json 변형 (custom·disabled·legacy·corrupt)                          |
| `mcp/`      | MCP 도구 e2e spec (Layer A / Layer B / bundle guards)                      |
| `hooks/`    | hook e2e spec (Layer A / Layer B / legacy migration)                       |
| `real-cli/` | 실 CLI smoke spec (`COGAIR_E2E_REAL_CLI=1` 일 때만)                        |

## Conventions

- 한 spec ≤15 케이스 (FCA-AI 3+12 룰)
- Layer A 파일은 `*.layerA.test.ts`, Layer B 는 `*.layerB.test.ts`, 둘 다 cover 는 `*.both.test.ts`
- fakeBinary 는 `src/dispatcher/__tests__/fakeBinary.ts` 의 함수 재사용
- 외부 CLI 호출은 기본 fake; real CLI 는 `describe.skipIf(!process.env.COGAIR_E2E_REAL_CLI)` 로 게이팅

## Boundaries

### Always do

- `vitest.e2e.globalSetup.ts` 가 `bridge/` 산출물 존재를 검증한 뒤 spec 실행
- 모든 e2e 가 `vitest.e2e.setup.ts` 의 HOME tmpdir 격리 안에서 동작

### Ask first

- 새 fake CLI 시나리오 추가 (dispatcher integration 과 일치 유지)
- spec 파일을 ≤15 케이스 초과해서 작성하는 경우 (분할 검토)

### Never do

- `process.exit` 또는 `process.chdir` 의 부수효과를 Layer A 에 도입
- entry.ts 를 Layer A 에서 직접 호출 (Layer B 책임)
- real CLI 테스트를 기본 스위트에 포함

## Dependencies

- `vitest`, `@modelcontextprotocol/sdk` (client + server in-memory transport)
- `node:http`, `node:child_process` 빌트인
- 빌드 산출물 `bridge/{mcp-server.cjs, injectStatic.mjs, injectDynamic.mjs}`
