# hooks -- Claude Code 훅 계층

## Purpose

Claude Code 훅 이벤트를 처리하는 fractal. SessionStart 에서 정적 정책 1회, UserPromptSubmit 마다 호출 카운터 + drift 상태를 `additionalContext` 로 주입한다. 엔트리 파일(`*.entry.ts`)은 esbuild 가 `bridge/*.mjs` 로 번들링.

## Structure

| 모듈            | 이벤트           | 역할                                                                                     |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `injectStatic`  | SessionStart     | config 기반 정적 정책 1회 주입                                                           |
| `injectDynamic` | UserPromptSubmit | counter 기반 라이브 상태 매 턴 주입                                                      |
| `shared` organ  | -                | `paths`, `safeReadJson`, `nowIso`, 공유 config 로더, `pickPreamble`, `pickRecencyFactor` |

## Conventions

- 외부 npm 모듈 import 금지 (`node:fs`, `node:path`, `node:os`, `node:crypto` 만)
- `src/core/`, `src/types/` import 금지 — zod / MCP SDK 가 번들에 빨리면 cap 위반
- 엔트리는 try/catch → 항상 `{ continue: true }` 출력 후 `process.exit(0)`
- 응답 JSON: `{ continue: true, hookSpecificOutput: { hookEventName, additionalContext } }`
- 수정 후 `yarn cogair build` 로 `bridge/*.mjs` 재생성

## Boundaries

### Always do

- 새 훅 추가 시 `hooks/hooks.json` 매핑 + `scripts/buildHooks.mjs` 의 `hookEntries` 동시 갱신
- 어떤 예외에도 세션을 절대 차단하지 않음 (`continue: true` 유지)

### Ask first

- 새 외부 의존성 (10 KB cap 위협)
- hook 이벤트 타입 변경

### Never do

- entry 파일에 비즈니스 로직
- `~/.claude/plugins/cogair/` 외부 경로 read
- counter 파일 write (read-only — counterManager 전담)

## Dependencies

- `node:*` builtins only
- esbuild 진입: `<name>/build/<name>.entry.ts`
