# preToolUse -- PreToolUse 오케스트레이터

## Purpose

PreToolUse 이벤트를 받아 `intentInjector` + `preToolValidator` + `structureGuard`를 조합 실행하고 결과를 단일 `HookOutput`으로 머지한다. 비-FCA 프로젝트는 최상단 게이트에서 전부 스킵(opt-in 원칙). Read는 intent 주입만, Write/Edit은 방문 기록(`recordWriteVisit`) 후 검증·구조 가드·spike 모드 게이트·mode audit까지 실행한다.

## Structure

- `preToolUse.ts` — `handlePreToolUse` (async orchestrator)
- `preToolUse.entry.ts` — esbuild 번들 진입점 (stdin → handler → stdout)
- `utils/mergeResults.ts` — HookOutput 결합 알고리즘
- `utils/auditDocDecision.ts` — 문서 계약 대상 판정의 audit 기록

## Conventions

- 실행 순서 (`validateCwd`→`isFcaProject` 게이트 통과 후):
  1. `injectIntent` (Read)
  2. Write/Edit이면 `recordWriteVisit` → `isDetailMd`/`isCriteriaMd` 판정 후 기존 content 읽기 → spike 판정(`readCurrentBranch`+`isSpikeBranch`, 브랜치명 단일 권위, 매 이벤트 fresh) → `validatePreToolUse`
  3. Write/Edit이면 `guardStructure`
  4. 문서 계약 대상이면 머지 결과를 `auditDocDecision`으로 기록
- spike 면제는 INTENT/DETAIL 위생 deny 한정; criteria.md는 항상 검증
- `mergeResults` 규칙:
  - `permissionDecision`: 하나라도 deny면 deny (AND); reason은 `\n\n` concat
  - `additionalContext`: 비어 있지 않은 문자열을 `\n\n` concat (deny와 공존 가능)
- 결과 이벤트명은 `'PreToolUse'` 고정; 엔트리 파일은 비즈니스 로직 추가 금지

## Boundaries

### Always do

- `validateCwd` 실패 시 즉시 `{ continue: true }` 반환
- DETAIL.md/criteria.md 편집 시 기존 content를 먼저 읽어 old 인자로 전달
- 문서 계약 대상 Write/Edit은 빠짐없이 audit (allow/deny/exempt + mode + rule)

### Ask first

- 실행 순서 재배치 (intent 주입이 항상 최우선이어야 함)
- spike 판정 권위 원천 변경 (브랜치명 단일 권위 — config 모드 필드 도입 금지)

### Never do

- 오케스트레이터에 검증·가드 로직을 인라인 (하위 모듈 호출만 유지)
- `deny` 결정을 무시하고 차단 해제 반환 (spike 면제는 validator 내부 게이트만 경유)

## Dependencies

- `./helpers/` (`intentInjector`, `preToolValidator`, `structureGuard`), `../shared/`
- `../utils/` (`validateCwd`, `readCurrentBranch`, `isSpikeBranch`)
- `../../core/infra/cacheManager/` (`appendModeAudit`), `../../types/hooks.js`, `node:fs`, `node:path`
