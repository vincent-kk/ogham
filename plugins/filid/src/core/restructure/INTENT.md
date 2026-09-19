# restructure — read-only placement plan

## Purpose

한 `ProjectSnapshot`에서 source의 목표 위치, required artifact, import rewrite 후보와 실행 전후 검증 결과를 산출한다. project source는 변경하지 않는다.

## Conventions

- 판단 우선순위: 1. exact snapshot evidence 2. 경계 보존 3. 자동화.
- 모든 machine path 연산은 portable API를 사용한다.
- organ은 leaf로 유지하고 분리 함수 파일을 organ 안에 flat하게 둔다.
- evidence가 이름·계약을 확정하지 못하면 unresolved로 남긴다. filid가 쓸 수 없는 specifier는 호출자에게 위임하고 postcondition에서 해석 결과로 검증한다.
- `moves`는 실행 순서이고 `affectedImports`는 모든 move 뒤의 최종 배치 기준이다. 자동으로 순서를 정할 수 없는 겹침만 unresolved로 남긴다.

## Boundaries

### Always do

- LCA, source/target, basis와 decision reason을 각 move에 기록하고, 사유·충돌·finding마다 message와 nextAction을 싣기
- independent fractal에 문서 두 역할과 adapter-derived entry 역할을 요구
- non-exact graph와 stale snapshot을 PASS가 아닌 finding으로 반환

### Ask first

- `RestructurePlan` 또는 validation finding 공개 형태 변경
- source 이동이나 import rewrite 실행 기능 추가

### Never do

- project file 생성·이동·삭제·수정
- 언어 확장자, entry filename, alias 의미 또는 grab-bag 이름 추측
- unresolved move나 source==target instruction을 실행 가능한 `moves`에 포함
