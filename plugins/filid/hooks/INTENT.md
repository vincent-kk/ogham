# hooks

## Purpose

Claude Code 플러그인의 Layer 1 자동 실행 계층. 3개 lifecycle 이벤트를 `bridge/*.mjs` 스크립트에 매핑하는 canonical 설정 노드.

## Structure

- `hooks.json` — Claude Code가 읽는 canonical 이벤트-핸들러 매핑
- 루트 `hooks.json`과 `.codex-plugin/hooks.json`은 공식 플러그인 빌드가 생성하는 산출물

| Event              | Matcher             | Bridge Script            | Timeout |
| ------------------ | ------------------- | ------------------------ | ------- |
| `SessionStart`     | `*`                 | `setup.mjs`              | 30s     |
| `PreToolUse`       | `Read\|Write\|Edit` | `pre-tool-use.mjs`       | 10s     |
| `UserPromptSubmit` | `*`                 | `user-prompt-submit.mjs` | 5s      |

## Conventions

- 모든 hook command는 `libs/run.cjs`를 통해 실행 (크로스 플랫폼 Node 해석기 탐색)
- 스크립트 경로는 `${CLAUDE_PLUGIN_ROOT}` 변수로 참조
- 구현체는 `src/hooks/<name>/<name>.entry.ts`에 위치, `scripts/buildHooks.mjs`로 번들링
- 공식 hook 빌드는 세 lifecycle bundle과 `run-agy.mjs`·`run-hook.cmd` 공용 runner만 유지

## Boundaries

### Always do

- `hooks.json` 수정 시 `scripts/buildHooks.mjs`의 `HOOK_ENTRIES` 배열과 동기화 유지
- 새 hook 추가 시 대응하는 `src/hooks/<name>/<name>.entry.ts` 진입점 생성
- 제거된 hook의 stale bridge bundle은 공식 hook 빌드에서 정리

### Ask first

- timeout 값 변경 (세션 응답성에 직접 영향)
- matcher 패턴 변경 (hook 실행 범위 변경)

### Never do

- `hooks.json`에 인라인 스크립트 직접 작성 (반드시 bridge 스크립트 경로 참조)
- `libs/run.cjs` 우회하여 직접 `.mjs` 실행 경로 설정
- 이 디렉터리에 구현 코드 배치 (설정 전용 노드)
- 루트 `hooks.json`, `.codex-plugin/hooks.json`, `bridge/*` 생성물을 직접 편집

## Dependencies

- `bridge/*.mjs` — esbuild 번들 출력물 (빌드 산출물)
- `libs/run.cjs` — 크로스 플랫폼 hook runner
- `src/hooks/<name>/<name>.entry.ts` — 소스 진입점 (빌드 입력)
