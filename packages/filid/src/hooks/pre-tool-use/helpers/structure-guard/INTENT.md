# structure-guard -- Write/Edit 구조 경고

## Purpose

Write/Edit이 디렉토리 구조를 위반할 가능성을 PreToolUse 시점에 경고한다. (1) INTENT.md 생성으로 organ이 fractal로 재분류되는 경우, (2) organ 하위에 새 디렉토리 생성, (3) import 구문으로 순환 의존성 유발. 어떤 경우에도 블록하지 않으며 `[filid:info]`/`[filid:warn]` 텍스트만 주입.

## Structure

- `structure-guard.ts` — `guardStructure`, `clearOrganCache` re-export
- 실제 검사 로직은 `../utils/` organ의 `check-intent-md-reclassification`, `check-organ-subdirectory`, `check-circular-imports`, `get-parent-segments`, `organ-structure-checker`에 위임

## Conventions

- `tool_name`이 Write/Edit이 아니면 즉시 continue
- `file_path`/`path` 둘 다 체크 (도구별 입력 키 호환)
- content는 `tool_input.content` (Write) 또는 `new_string` (Edit) 우선순위로 선택
- 결과 파트:
  - `[filid:info] structure-guard:` — 재분류 안내 (`checkIntentMdReclassification` 결과)
  - `[filid:warn] structure-guard:` — 위반 경고 (`checkOrganSubdirectory` + `checkCircularImports`)
- 번호 매기기는 각 블록 내에서 `${i + 1}. ` 형식
- 경고/안내 둘 다 없으면 `{ continue: true }` (추가 컨텍스트 없음)

## Boundaries

### Always do

- 어떤 조건에서도 `continue: false` 반환 금지 (경고 전용)
- 검사 로직은 `../utils/`로 분리 유지 (파일 내부 인라인 금지)

### Ask first

- 새 검사 종류 추가 (`checkForbiddenFile`, `checkNamingConvention` 등)
- 경고를 에러로 승격해 Write/Edit 블록

### Never do

- 동기 I/O 과다 호출 (훅 레이턴시 폭발)
- organ cache(`organ-structure-checker`)를 세션 간 공유

## Dependencies

- `../utils/` (`get-parent-segments`, `check-intent-md-reclassification`, `check-organ-subdirectory`, `check-circular-imports`, `organ-structure-checker`, `validate-cwd`)
- `../../types/hooks.js`
