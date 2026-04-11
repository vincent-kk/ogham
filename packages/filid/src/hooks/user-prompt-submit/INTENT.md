# user-prompt-submit -- UserPromptSubmit 오케스트레이터

## Purpose

사용자 프롬프트 제출 시점에 (1) 턴당 fmap 상태를 초기화해 다음 PreToolUse에서 INTENT.md가 재주입되도록 하고, (2) `context-injector.injectContext`에 위임해 세션 첫 프롬프트에 FCA-AI 규칙 포인터를 주입한다.

## Structure

- `user-prompt-submit.ts` — `handleUserPromptSubmit` (orchestrator)

## Conventions

- `validateCwd` 실패 시 즉시 continue
- Step 1 (per-turn reset): `isFcaProject(cwd)`일 때만 `removeFractalMap(cwd, session_id)` 호출
- Step 2 (context inject): 조건 없이 `injectContext(input)` 호출하고 그 결과를 그대로 반환
- 반환 타입은 `HookOutput` — `injectContext` 결과가 최종 계약
- 엔트리 파일 불필요 — `hooks.json`이 `injectContext`를 직접 호출할 수도 있지만, orchestrator를 경유해 fmap reset 보장

## Boundaries

### Always do

- fmap reset은 FCA 프로젝트에서만 수행 (비-FCA 캐시 파일 생성 방지)
- `injectContext` 결과를 가공하지 않고 그대로 반환

### Ask first

- Step 1/2 순서 변경 (현재는 reset → inject)
- fmap 외 추가 상태 리셋 (예: boundary 캐시)

### Never do

- `injectContext` 로직을 인라인 복제
- `continue: false` 반환 (프롬프트 차단 금지)

## Dependencies

- `../context-injector/` (`injectContext`)
- `../../core/infra/cache-manager/` (`removeFractalMap`)
- `../shared/` (`isFcaProject`)
- `../utils/validate-cwd.js`
- `../../types/hooks.js`
