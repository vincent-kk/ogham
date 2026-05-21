## Purpose

`@ogham/cogair` 패키지 루트. Gemini CLI / Codex CLI 위임용 Claude Code 플러그인.

## Structure

| Path | Role |
|---|---|
| `src/` | TypeScript 소스 (fractal 루트) |
| `scripts/` | esbuild 빌드 스크립트 (Phase 4·5·7 에서 추가) |
| `hooks/` | Claude Code 훅 매핑 (Phase 7 에서 작성) |
| `skills/` | `setup`, `codex`, `gemini` 스킬 (Phase 6) |
| `libs/run.cjs` | cross-platform Node 러너 (filid 동일) |
| `bridge/` | esbuild 산출물 (gitignored) |
| `.claude-plugin/plugin.json` | Claude Code 플러그인 매니페스트 |
| `.mcp.json` | MCP 서버 등록 (name: `tools`) |
| `PLAN.md` | 단계별 개발 체크리스트 + 스펙 링크 |

## Conventions

- 빌드 파이프라인은 filid 패턴 — `version:sync → settingsHtml → tsc → mcpServer → hooks`
- 플러그인 prefix 없는 스킬 이름 (`setup`, `codex`, `gemini`)
- Agent 없음

## Boundaries

### Always do

- `PLAN.md` 의 체크박스를 단계 종료 시 갱신
- 모든 디스크 경로는 `~/.claude/plugins/cogair/` 하위

### Ask first

- 새 빌드 스크립트 추가 (파이프라인 영향)
- `package.json` 의 `files` 배열 변경 (배포 산출물 범위)

### Never do

- `bridge/`, `dist/` 를 커밋
- `version.ts` 또는 `.claude-plugin/plugin.json` 의 version 을 손으로 수정 (inject-version.mjs 만)
