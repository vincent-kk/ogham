# ast

## Purpose

@ast-grep/napi 기반 AST 코드 분석. Phase 3(devplan)에서 imbas-engineer가 코드 구조 파악에 사용.

## Structure

- `ast-grep-shared.ts` — napi lazy-load + graceful degradation
- `dependency-extractor.ts` — import/export/call 추출
- `cyclomatic-complexity.ts` — 순환 복잡도 계산

## Boundaries

### Always do

- napi 미설치 시 `{ error, sgLoadError }` 반환 (throw 금지)
- 세션 내 napi 로드 실패는 한 번만 시도

### Ask first

- 새 분석 타입 추가
- 지원 언어 확장

### Never do

- @ast-grep/napi를 package.json 의존성에 추가 (전역 설치 기대)
- 코드 수정(replace) 기능 구현 (imbas는 읽기 전용)
