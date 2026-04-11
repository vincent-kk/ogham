# organ-classifier -- 노드 타입 우선순위 분류

## Purpose

디렉토리 메타데이터(`ClassifyInput`)를 받아 `fractal` / `organ` / `pure-function` 중 하나로 분류한다. FCA-AI 문서에 정의된 7단계 우선순위를 단일 순수 함수로 구현한 분류 엔진이다.

## Structure

- `organ-classifier.ts` — `classifyNode`, `isInfraOrgDirectoryByPattern`, `KNOWN_ORGAN_DIR_NAMES` re-export, `ClassifyInput` 인터페이스

## Conventions

- 분류 우선순위(위에서 아래로 짧은 회로):
  1. `hasIntentMd` → `fractal`
  2. `hasDetailMd` → `fractal`
  3. `__name__` 또는 `.name` 인프라 패턴 → `organ`
  4. `KNOWN_ORGAN_DIR_NAMES` 이름 매치 → `organ`
  5. `hasIndex` + non-organ 이름 → `fractal`
  6. `!hasFractalChildren && isLeafDirectory` → `organ`
  7. `!hasSideEffects` → `pure-function`
  8. 기본 → `fractal`
- `hasSideEffects` 미지정 시 `true`로 간주 (안전 기본값)
- `KNOWN_ORGAN_DIR_NAMES`는 `constants/organ-names.ts`에서 import 후 re-export만

## Boundaries

### Always do

- 우선순위 변경 시 `07-RULES-REFERENCE.md` 문서와 `__tests__/unit/core/tree/organ-classifier/` 갱신
- 새 조건 추가 시 `ClassifyInput` 필드 확장

### Ask first

- `KNOWN_ORGAN_DIR_NAMES` 목록 수정 (사용자 프로젝트 영향)
- 우선순위 단계 추가/재배치

### Never do

- 파일 I/O 수행 (입력은 모두 메타데이터)
- 이름 기반 분류(`KNOWN_ORGAN_DIR_NAMES`)를 구조 기반 분류보다 우선 적용

## Dependencies

- `../../../types/fractal.js` (`CategoryType`)
- `../../../constants/organ-names.js` (`KNOWN_ORGAN_DIR_NAMES`)
