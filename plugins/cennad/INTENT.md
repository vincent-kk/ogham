## Purpose

`@ogham/cennad` 패키지 루트. Codex CLI / Antigravity CLI / Claude CLI 위임용 Claude Code 플러그인. Windows 호환성은 [`.metadata/cross-platform/`](../../.metadata/cross-platform/) 에서 추적.

## Structure

| Path                         | Role                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| `src/`                       | TypeScript 소스 (fractal 루트)                               |
| `scripts/`                   | esbuild 빌드 스크립트                                        |
| `hooks/`                     | Claude Code 훅 매핑                                          |
| `skills/`                    | `setup`, `codex`, `antigravity`, `claude`, `crosscheck` 스킬 |
| `agents/`                    | `courier` — 스킬이 background spawn 하는 위임 실행 에이전트  |
| `libs/run.cjs`               | cross-platform Node 러너 (filid 동일)                        |
| `bridge/`                    | esbuild 산출물 (커밋 — `package.json:files`)                 |
| `public/settings.html`       | 빌드된 settings UI — 런타임 디스크 서빙 (커밋)               |
| `.claude-plugin/plugin.json` | Claude Code 플러그인 매니페스트                              |
| `.mcp.json`                  | MCP 서버 등록 (name: `tools`)                                |

## Conventions

- 빌드(도메인 스크립트 조합): `clean → version:sync → pages → compile → mcp → hooks → compile-plugin`
- 플러그인 prefix 없는 스킬 이름 (`setup`, `codex`, `antigravity`, `claude`, `crosscheck`)
- Agent 는 `courier` 1개 (`cennad:courier`) — 관점(정교화 ≤3콜 · 실패 remedy · tier 의미론)은 courier, 스킬은 행동(파싱→background spawn→릴레이)만 (비블로킹)
- E2E 는 이중 레이어 (Layer A in-process + Layer B 번들 stdio); `CENNAD_E2E_REAL_CLI=1` 일 때만 real CLI

## Boundaries

### Always do

- 디스크 경로는 기본 `~/.claude/plugins/cennad/` 하위이며 `CENNAD_CONFIG_PATH` 로 override 가능 (opt-in project artifacts: `<cwd>/.cennad/`)

### Ask first

- 새 빌드 스크립트 추가 (파이프라인 영향)
- `package.json` 의 `files` 배열 변경 (배포 산출물 범위)

### Never do

- `dist/` 를 커밋 (`bridge/` · `public/` 는 의도적 커밋 — `package.json:files` 포함)
- `version.ts` 또는 `.claude-plugin/plugin.json` 의 version 을 손으로 수정 (inject-version.mjs 만)

## Dependencies

- **런타임**: `@modelcontextprotocol/sdk ~1.22.0`, `zod ^3.23.8`
- **개발**: `esbuild ^0.24.0`, `typescript ^5.7.2`, `vitest ^4.1.2`, `@types/node ^20.11.0`
- **환경**: Node.js >= 20, Yarn 4.12 workspaces
- **빌드 스크립트**: `scripts/buildSettingsHtml.mjs`, `scripts/buildMcpServer.mjs`, `scripts/buildHooks.mjs`, `../../scripts/inject-version.mjs`
