# hooks -- Claude Code 훅 계층

## Purpose

Claude Code 훅 이벤트를 처리하는 fractal. 3개 provider(codex, antigravity, claude)를 지원한다. SessionStart 에서 정적 정책 1회, UserPromptSubmit 마다 호출 카운터 + drift 상태를 `additionalContext` 로 주입한다. 엔트리 파일(`*.entry.ts`)은 esbuild 가 `bridge/*.mjs` 로 번들링.

## Conventions

- 외부 npm 모듈 import 금지 (`node:*`와 `@ogham/cross-platform` package root의 named export만 사용)
- core 및 types 계층 import 금지 — zod / MCP SDK 가 번들에 빨리면 cap 위반
- shared path/config mirror 는 package의 중앙 path 정책과 일치 유지: 기본 `pluginCache('cennad')`, non-blank `CENNAD_CONFIG_PATH` override, `CLAUDE_PLUGIN_DATA`/`CLAUDE_PLUGIN_DADA` 무시
- config 는 core 와 같은 2계층(user < project)을 package root의 `mergeConfigLayers` 로 합친다. project 루트는 호스트가 훅을 띄운 `process.cwd()` 를 쓴다
- 공유 package root의 미사용 export는 `sideEffects: false`와 tree-shaking으로 제거하고, hook builder의 emitted-byte cap과 `FORBIDDEN_PATTERNS`로 실제 출력 회귀를 막는다
- 세션 동일성은 공유 `hostSessionIdentity` resolver로 판정한다. non-blank `CENNAD_HOST_SESSION_ID`를 우선하고 유효한 `CLAUDE_PID`를 fallback하며 `process.ppid`는 세션 식별에 쓰지 않는다
- 엔트리는 try/catch → 항상 `{ continue: true }` 출력 후 `process.exit(0)`
- 응답 JSON: `{ continue: true, hookSpecificOutput: { hookEventName, additionalContext } }`
- 수정 후 `yarn cennad build` 로 `bridge/*.mjs` 재생성

## Boundaries

### Always do

- 새 훅 추가 시 hook 매핑과 build entry registry를 동시에 갱신
- 어떤 예외에도 세션을 절대 차단하지 않음 (`continue: true` 유지)

### Ask first

- 새 외부 의존성 (10 KB cap 위협)
- hook 이벤트 타입 변경

### Never do

- entry 파일에 비즈니스 로직
- cennad data home write (hooks 는 config/counter 모두 read-only)
- counter 파일 write (read-only — counterManager 전담)
