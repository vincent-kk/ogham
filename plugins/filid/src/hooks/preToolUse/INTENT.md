# preToolUse — PreToolUse 오케스트레이터

## Purpose

PreToolUse 이벤트에서 방문 전달, INTENT/DETAIL write gate와 구조 가드를 순서대로 조합한다. 비-FCA 프로젝트는 최상단에서 통과시키며, branch mode와 criteria ledger는 hook 권한 판정에 사용하지 않는다.

## Structure

- `preToolUse.ts` — `handlePreToolUse` (async orchestrator)
- `preToolUse.entry.ts` — esbuild 번들 진입점 (stdin → handler → stdout)
- `utils/mergeResults.ts` — HookOutput 결합 알고리즘
- `DETAIL.md` — 공개 runtime 순서와 acceptance contract

## Conventions

- 실행 순서: `validateCwd` → `isFcaProject` → `processVisit` → Write/Edit이면 `validatePreToolUse` → `guardStructure`
- 방문 deny는 규칙을 전달한 결과이므로 즉시 반환하고 동일 재시도가 나머지 경로를 실행한다.
- 기존 content는 DETAIL.md 검증에만 best-effort로 읽는다.
- `mergeResults` 규칙:
  - `permissionDecision`: 하나라도 deny면 deny (AND); reason은 `\n\n` concat
  - `additionalContext`: 비어 있지 않은 문자열을 `\n\n` concat (deny와 공존 가능)
- 결과 이벤트명은 `'PreToolUse'` 고정; 엔트리 파일은 비즈니스 로직 추가 금지

## Boundaries

### Always do

- `validateCwd` 실패 시 즉시 `{ continue: true }` 반환
- DETAIL.md 편집 시 기존 content를 먼저 읽어 old 인자로 전달
- branch 이름과 무관하게 동일한 방문·문서 gate를 적용

### Ask first

- 실행 순서 재배치 (intent 주입이 항상 최우선)
- hook permission scope에 새 문서나 branch mode 추가

### Never do

- 오케스트레이터에 검증·가드 로직을 인라인 (하위 모듈 호출만 유지)
- `deny` 결정을 무시하거나 branch 이름으로 면제
- criteria ledger를 hook 전용 deny 또는 audit 대상으로 취급

## Dependencies

- `./helpers/` (`intentInjector`, `preToolValidator`, `structureGuard`), `../shared/`
- `../utils/validateCwd.js`, `../../types/hooks.js`, `node:fs`, `node:path`
