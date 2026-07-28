# restructure — read-only placement plan

## Purpose

한 `ProjectSnapshot`에서 source의 목표 위치, required artifact, import rewrite 후보와 실행 전후 검증 결과를 산출한다. project source는 변경하지 않는다.

## Structure

| Path          | Role                                            |
| ------------- | ----------------------------------------------- |
| `index.ts`    | named public barrel                             |
| `planner/`    | flat placement와 plan summary 계산 organ        |
| `imports/`    | flat exact path-like import rewrite 계산 organ  |
| `specifiers/` | flat specifier stem·확장자 표기 판정 organ      |
| `validator/`  | flat snapshot 기반 pre/postcondition 검사 organ |
| `__tests__/`  | 15-case contract spec와 32-case test-record     |

## Conventions

- 판단 우선순위: 1. exact snapshot evidence 2. 경계 보존 3. 자동화.
- 모든 machine path 연산은 portable API를 사용한다.
- organ은 leaf로 유지하고 분리 함수 파일을 organ 안에 flat하게 둔다.
- evidence가 이름·계약·specifier를 확정하지 못하면 unresolved로 남긴다.

## Boundaries

### Always do

- LCA, source/target, basis와 decision reason을 각 move에 기록
- independent fractal에 문서 두 역할과 adapter-derived entry 역할을 요구
- non-exact graph와 stale snapshot을 PASS가 아닌 finding으로 반환

### Ask first

- `RestructurePlan` 또는 validation finding 공개 형태 변경
- source 이동이나 import rewrite 실행 기능 추가

### Never do

- project file 생성·이동·삭제·수정
- 언어 확장자, entry filename, alias 의미 또는 grab-bag 이름 추측
- unresolved move나 source==target instruction을 실행 가능한 `moves`에 포함

## Dependencies

- `../analysis/lcaCalculator/`, `../../types/`, `../../constants/`, `@ogham/cross-platform`
