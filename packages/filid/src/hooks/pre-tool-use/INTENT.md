# pre-tool-use -- PreToolUse 오케스트레이터

## Purpose

PreToolUse 이벤트를 받아 `intent-injector` + `pre-tool-validator` + `structure-guard`를 조합 실행하고 결과를 단일 `HookOutput`으로 머지한다. Read는 intent 주입만, Write/Edit은 추가로 검증·구조 가드까지 실행한다.

## Structure

- `pre-tool-use.ts` — `handlePreToolUse` (async orchestrator), `mergeResults` (HookOutput 결합 알고리즘)
- `pre-tool-use.entry.ts` — esbuild 번들 진입점 (stdin → handler → stdout)

## Conventions

- 실행 순서:
  1. `injectIntent` (Read/Write/Edit 모두)
  2. Write/Edit이면 `isDetailMd` 판정 후 기존 content 읽기 → `validatePreToolUse`
  3. Write/Edit이면 `guardStructure`
- `mergeResults` 규칙:
  - `continue`: 하나라도 false면 false (AND)
  - `additionalContext`: 비어 있지 않은 문자열을 `\n\n`으로 concat
  - 블록 발생 시 첫 번째 블로커의 `hookSpecificOutput` 채택
- 결과 이벤트명은 언제나 `'PreToolUse'`로 고정
- 엔트리 파일은 비즈니스 로직 추가 금지

## Boundaries

### Always do

- `validateCwd` 실패 시 즉시 `{ continue: true }` 반환
- DETAIL.md 편집 시 기존 content를 먼저 읽어 `validatePreToolUse`에 old 인자로 전달

### Ask first

- 실행 순서 재배치 (intent 주입이 항상 최우선이어야 함)
- `mergeResults`의 AND 결합 방식을 OR로 변경

### Never do

- 오케스트레이터에 검증·가드 로직을 인라인 (하위 모듈 호출만 유지)
- 블록 결정을 무시하고 `continue: true` 반환

## Dependencies

- `../intent-injector/`, `../pre-tool-validator/`, `../structure-guard/`, `../shared/`
- `../utils/validate-cwd.js`
- `../../types/hooks.js`
- `node:fs`, `node:path`
