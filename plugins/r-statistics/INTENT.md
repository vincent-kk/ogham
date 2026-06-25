## Purpose

`@ogham/r-statistics` 패키지 루트. Claude 를 도메인 중립 "통계 전문가" 로 만드는 Claude Code 플러그인. 유일한 도메인은 통계 방법론 — 어떤 응용 도메인에도 앵커링하지 않는다. 비결정 추론 에이전트를 결정적 상태머신(Dispatcher)+결정적 실행(MCP)이 감싼다. 설계 명세는 [`.metadata/r-statistics/`](../../.metadata/r-statistics/).

## Structure

| Path                         | Role                                                 |
| ---------------------------- | ---------------------------------------------------- |
| `src/`                       | MCP 서버 TypeScript 소스 (fractal 루트)              |
| `skills/`                    | 노출 스킬 6 (analyze=Dispatcher + lazy `methods/`)   |
| `agents/`                    | statistician · r-expert · methodology-validator      |
| `shared/contract.R`          | 공통 R 실행계약 (init/finalize + 아티팩트 헬퍼)      |
| `scripts/buildMcpServer.mjs` | esbuild 번들 스크립트                                |
| `bridge/`                    | esbuild 산출물 (커밋 — `package.json:files`)         |
| `.claude-plugin/plugin.json` | 매니페스트 / `.mcp.json` MCP 서버 등록(name `tools`) |

## Conventions

- 빌드: `clean → version:sync → tsc → buildMcpServer`
- 스킬 이름 prefix 없음 (plugin namespace 자동); MCP 도구는 `mcp_tools_*`
- 에이전트는 `agents/` 자동 발견 (plugin.json 에 agents 필드 없음 — filid 동일)
- Hook 없음

## Boundaries

### Always do

- 디스크 경로는 `~/.claude/plugins/r-statistics/` 하위
- 개발 착수 전 `.metadata/r-statistics/` 확인

### Ask first

- 새 빌드 스크립트 추가
- `package.json` `files` 배열 변경

### Never do

- `dist/` 커밋 (`bridge/` 는 의도적 커밋)
- `version.ts` / `plugin.json` 의 version 수동 수정 (inject-version.mjs 만)

## Dependencies

- 런타임: `@modelcontextprotocol/sdk ~1.22`, `zod ^3.23`
- 개발: `esbuild`, `typescript`, `vitest`, `@types/node`
- 환경: Node.js >= 20, Yarn 4.12 workspaces; 실행 시 외부 `Rscript`
