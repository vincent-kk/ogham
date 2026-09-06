# hooks

## Purpose

Claude Code 플러그인의 Layer 1 자동 실행 계층. 3개 lifecycle 이벤트의 4개 진입점을 `bridge/*.mjs` 스크립트에 매핑하는 canonical 설정 노드.

## Structure

- `hooks.json` — Claude Code가 읽는 canonical 이벤트-핸들러 매핑
- 루트 `hooks.json`과 `.codex-plugin/hooks.json`은 공식 플러그인 빌드가 생성하는 산출물

| Event              | Matcher             | Bridge Script            | Timeout |
| ------------------ | ------------------- | ------------------------ | ------- |
| `SessionStart`     | `*`                 | `setup.mjs`              | 30s     |
| `PreToolUse`       | `Read\|Write\|Edit` | `pre-tool-use.mjs`       | 10s     |
| `PreToolUse`       | `*`                 | `guard-review-actor.mjs` | 5s      |
| `UserPromptSubmit` | `*`                 | `user-prompt-submit.mjs` | 5s      |

## Conventions

- Claude·Codex hook command는 `libs/run.cjs`, agy 는 `run-agy.mjs` 를 통해 실행
- 스크립트 경로는 `${CLAUDE_PLUGIN_ROOT}` 변수로 참조
- 구현체는 `src/hooks/<name>/<name>.entry.ts`에 위치, `scripts/buildHooks.mjs`로 번들링
- 공식 hook 빌드는 네 lifecycle bundle과 `run-agy.mjs`·`run-hook.cmd` 공용 runner만 유지

## Boundaries

### Always do

- canonical manifest와 hook build entry 목록을 동기화
- 새 hook 추가 시 대응하는 TypeScript bundle 진입점 생성
- 제거된 hook의 stale bridge bundle은 공식 hook 빌드에서 정리

### Ask first

- timeout 값 변경 (세션 응답성에 직접 영향)
- matcher 패턴 변경 (hook 실행 범위 변경)

### Never do

- canonical manifest에 인라인 스크립트 직접 작성 (반드시 bridge bundle 참조)
- 공용 host runner를 우회하는 직접 bundle 실행 경로 설정
- 이 디렉터리에 구현 코드 배치 (설정 전용 노드)
- 생성된 host adapter와 runtime bundle을 직접 편집

## Dependencies

- `bridge/*.mjs` — esbuild 번들 출력물 (빌드 산출물)
- `libs/run.cjs` — 크로스 플랫폼 hook runner
- `src/hooks/<name>/<name>.entry.ts` — 소스 진입점 (빌드 입력)
