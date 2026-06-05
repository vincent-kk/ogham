# hooks

## Purpose

Claude Code 플러그인의 Layer 1 자동 실행 계층. lifecycle 이벤트를 `bridge/*.mjs` 스크립트에 매핑하는 정적 설정 노드.

## Structure

- `hooks.json` — Claude Code 가 읽는 이벤트-핸들러 매핑 설정

| Event          | Matcher | Bridge Script      | Timeout |
| -------------- | ------- | ------------------ | ------- |
| `SessionStart` | `*`     | `injectStatic.mjs` | 5s      |

## Conventions

- 모든 hook command 는 `libs/run.cjs` 를 통해 실행 (크로스 플랫폼 Node 해석)
- 스크립트 경로는 `${CLAUDE_PLUGIN_ROOT}` 변수로 참조
- 구현체는 `src/hooks/<name>/build/<name>.entry.ts`, `scripts/buildHooks.mjs` 가 esbuild 로 번들링

## Boundaries

### Always do

- `hooks.json` 수정 시 `scripts/buildHooks.mjs` 의 `hookEntries` 와 동기화 유지
- 새 hook 추가 시 `src/hooks/<name>/build/<name>.entry.ts` 진입점 생성

### Ask first

- timeout 값 변경 (세션 응답성)
- matcher 패턴 변경

### Never do

- `hooks.json` 에 인라인 스크립트 직접 작성
- `libs/run.cjs` 우회
- 이 디렉터리에 구현 코드 배치 (설정 전용 노드)

## Dependencies

- `bridge/*.mjs` (esbuild 산출물)
- `libs/run.cjs` (크로스 플랫폼 hook runner)
- `src/hooks/<name>/build/<name>.entry.ts` (빌드 입력)
