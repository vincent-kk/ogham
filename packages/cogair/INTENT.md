## Purpose

`@ogham/cogair` 패키지 루트. Gemini CLI / Codex CLI 위임용 Claude Code 플러그인. Windows 호환성은 [`.metadata/cross-platform/`](../../.metadata/cross-platform/) 에서 추적.

## Structure

| Path                         | Role                                           |
| ---------------------------- | ---------------------------------------------- |
| `src/`                       | TypeScript 소스 (fractal 루트)                 |
| `scripts/`                   | esbuild 빌드 스크립트                          |
| `hooks/`                     | Claude Code 훅 매핑                            |
| `skills/`                    | `setup`, `codex`, `gemini`, `crosscheck` 스킬  |
| `libs/run.cjs`               | cross-platform Node 러너 (filid 동일)          |
| `bridge/`                    | esbuild 산출물 (커밋 — `package.json:files`)   |
| `public/settings.html`       | 빌드된 settings UI — 런타임 디스크 서빙 (커밋) |
| `.claude-plugin/plugin.json` | Claude Code 플러그인 매니페스트                |
| `.mcp.json`                  | MCP 서버 등록 (name: `tools`)                  |

## Conventions

- 빌드 파이프라인은 filid 패턴 — `version:sync → settingsHtml → tsc → mcpServer → hooks`
- 플러그인 prefix 없는 스킬 이름 (`setup`, `codex`, `gemini`, `crosscheck`)
- Agent 없음
- E2E 는 이중 레이어 (Layer A in-process + Layer B 번들 stdio); `COGAIR_E2E_REAL_CLI=1` 일 때만 real CLI

## Boundaries

### Always do

- 디스크 경로는 `~/.claude/plugins/cogair/` 하위 (opt-in project artifacts: `<cwd>/.cogair/`)

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
