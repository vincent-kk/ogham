## Purpose

`@ogham/prawf` 패키지 루트. Claude Code 플러그인 — esbuild 산출물(`bridge/`)을 커밋해 배포하는 cogair 동형 구조. MCP 서버는 현재 도구 0개 stub, skills/agents 는 빈 디렉토리 골격.

## Structure

| Path                         | Role                                         |
| ---------------------------- | -------------------------------------------- |
| `src/`                       | TypeScript 소스 (fractal 루트)               |
| `scripts/`                   | esbuild 빌드 스크립트                        |
| `hooks/`                     | Claude Code 훅 매핑 (`hooks.json`)           |
| `skills/`                    | 스킬 디렉토리 (`.gitkeep` — 비어 있음)       |
| `agents/`                    | 에이전트 디렉토리 (`.gitkeep` — 비어 있음)   |
| `libs/run.cjs`               | cross-platform Node 러너                     |
| `bridge/`                    | esbuild 산출물 (커밋 — `package.json:files`) |
| `.claude-plugin/plugin.json` | Claude Code 플러그인 매니페스트              |
| `.mcp.json`                  | MCP 서버 등록 (name: `tools`)                |

## Conventions

- 빌드 파이프라인: `version:sync → tsc → mcpServer → hooks`
- 스킬/에이전트는 마크다운 (빌드 불필요), MCP·훅은 esbuild → `bridge/`

## Boundaries

### Always do

- 디스크 산출물은 `bridge/` 로, `package.json:files` 에 포함해 커밋

### Ask first

- 새 빌드 스크립트 추가 (파이프라인 영향)
- `package.json` 의 `files` 배열 변경

### Never do

- `dist/` 를 커밋 (`bridge/` 는 의도적 커밋)
- `version.ts` / `plugin.json` 의 version 손으로 수정 (inject-version.mjs 만)

## Dependencies

- **런타임**: `@modelcontextprotocol/sdk ~1.22.0`, `zod ^3.23.8`
- **개발**: `esbuild ^0.24.0`, `typescript ^5.7.2`, `vitest ^4.1.2`
- **빌드 스크립트**: `scripts/buildMcpServer.mjs`, `scripts/buildHooks.mjs`, `../../scripts/inject-version.mjs`
