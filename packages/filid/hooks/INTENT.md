# hooks

## Purpose

Claude Code 플러그인의 Layer 1 자동 실행 계층. 5개 lifecycle 이벤트를 `bridge/*.mjs` 스크립트에 매핑하는 정적 설정 노드.

## Structure

- `hooks.json` — Claude Code가 읽는 이벤트-핸들러 매핑 설정

| Event | Matcher | Bridge Script | Timeout |
|---|---|---|---|
| `SessionStart` | `*` | `setup.mjs` | 30s |
| `PreToolUse` | `Read\|Write\|Edit` | `pre-tool-use.mjs` | 10s |
| `SubagentStart` | `*` | `agent-enforcer.mjs` | 3s |
| `UserPromptSubmit` | `*` | `context-injector.mjs` | 5s |
| `SessionEnd` | `*` | `session-cleanup.mjs` | 3s |

## Conventions

- 모든 hook command는 `libs/run.cjs`를 통해 실행 (크로스 플랫폼 Node 해석기 탐색)
- 스크립트 경로는 `${CLAUDE_PLUGIN_ROOT}` 변수로 참조
- 구현체는 `src/hooks/entries/*.entry.ts`에 위치, `scripts/build-hooks.mjs`로 번들링

## Boundaries

### Always do

- `hooks.json` 수정 시 `scripts/build-hooks.mjs`의 `hookEntries` 배열과 동기화 유지
- 새 hook 추가 시 대응하는 `src/hooks/entries/<name>.entry.ts` 진입점 생성

### Ask first

- timeout 값 변경 (세션 응답성에 직접 영향)
- matcher 패턴 변경 (hook 실행 범위 변경)

### Never do

- `hooks.json`에 인라인 스크립트 직접 작성 (반드시 bridge 스크립트 경로 참조)
- `libs/run.cjs` 우회하여 직접 `.mjs` 실행 경로 설정
- 이 디렉터리에 구현 코드 배치 (설정 전용 노드)

## Dependencies

- `bridge/*.mjs` — esbuild 번들 출력물 (빌드 산출물)
- `libs/run.cjs` — 크로스 플랫폼 hook runner
- `src/hooks/entries/*.entry.ts` — 소스 진입점 (빌드 입력)
