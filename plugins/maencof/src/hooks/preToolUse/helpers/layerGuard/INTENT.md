# layerGuard

## Purpose

PreToolUse 관심사. maencof vault 안에서 Layer 1(Core) 문서의 직접 `Write`·`Edit`·`Delete` mutation 을 막는다.

## Conventions

- vault 범위는 `isInsideMaencofVault`, target 해석은 shared canonicalizer, 보호 경로는 `isLayer1Path` 를 정본으로 사용
- 차단 신호만 반환하고 permission deny envelope 번역은 상위 디스패처에 맡김

## Boundaries

### Always do

- vault gate 를 경로 판정보다 먼저 실행
- Write/Edit는 기존 target을, Delete는 terminal entry를 보존한 parent를 host filesystem 기준으로 canonicalize한 뒤 layer를 판정
- `Write`·`Edit`·`Delete` 에 동일한 L1 승인 규칙 적용

### Ask first

- 보호 레이어·mutation 범위 변경
- canonical target 판정 또는 filesystem 오류 정책 변경

### Never do

- 보호 우회 로직 추가
- lexical spelling만 검사해 case alias·symlink ancestor를 놓치거나 Delete terminal symlink를 역참조하기
- `Delete` 를 L1 보호에서 제외
