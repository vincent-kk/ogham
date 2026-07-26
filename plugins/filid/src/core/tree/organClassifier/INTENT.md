# organClassifier — FCA priority classification

## Purpose

언어 중립 directory metadata를 FCA node type으로 분류하는 순수 우선순위 함수다.

## Structure

- `organClassifier.ts` — `classifyNode`, infra pattern 판정과 `ClassifyInput`

## Conventions

- 순서: documents → known organ → infra pattern → adapter entry → leaf → proven purity → fractal.
- purity 미지원은 side-effectful 안전 기본값으로 본다.
- hybrid는 입력에서 명시하지 않는 한 반환하지 않는다.

## Boundaries

### Always do

- 각 priority override를 table test로 고정
- entry point는 descriptor 존재 여부로만 판정

### Ask first

- known organ 목록 또는 우선순위 단계 변경

### Never do

- filesystem I/O 또는 entry filename 해석
- unsupported purity를 pure-function으로 판정

## Dependencies

- `../../../types/fractal.js`, `../../../constants/organNames.js`
