# restructure — Contract

## Requirements

- `createRestructurePlan`은 입력 snapshot만 읽고 project tree를 변경하지 않는다.
- 생략된 consumer는 source로 향하는 dependency evidence에서 계산한다.
- `contractIntent` 생략값은 `unknown`이며 문서/public-surface evidence가 independent를 확정하지 못하면 unresolved다.
- internal unit은 single owner 또는 lowest common fractal 아래의 의미 organ 후보로, independent unit은 새 fractal 후보로 계획한다.
- 의미 organ 이름, adapter-derived entry path 또는 exact path-like import rewrite가 없으면 추측하지 않고 decision reason을 반환한다.
- specifier가 resolved file을 가리키는지는 **마지막 세그먼트의 확장자를 제거한 형태**로 판정한다. 소스 확장자를 그대로 적을 수 없는 생태계 관례(TypeScript ESM이 `.ts` 파일을 `.js`로 참조, 확장자 생략)를 exact evidence로 인정하기 위해서다. stem이 다르면(디렉터리 index 참조 등) 여전히 decision reason이다.
- rewrite 결과는 소비자가 쓰던 확장자 표기를 보존한다. core는 어느 확장자가 유효한지 알지 못하며, 원래 specifier의 표기를 그대로 되돌려 준다.
- 계산된 target이 source와 같으면 옮길 것이 없다. 그런 instruction은 `moves`가 아니라 `alreadyPlaced`로 분리한다. postcondition은 두 갈래를 다르게 본다 — `moves`에는 source 부재까지, `alreadyPlaced`에는 source 부재만 뺀 나머지 전부를 요구한다. 그래야 "source 부재"와 "target 존재"가 같은 경로에 동시에 요구되지 않으면서, 계획 밖 경로에 착지한 유닛도 통과하지 못한다.
- 요청을 조용히 버리지 않는다. 이미 제자리인 유닛도 계산된 LCA·basis·consumer와 남은 required artifact를 그대로 실은 instruction으로 돌려준다.
- validation은 post-execution snapshot만으로 exact target, source 부재, artifact, entry point, import boundary와 DAG를 검사한다. import rewrite 대조도 계획 산출과 같은 stem 판정을 쓴다.
- planner/imports/specifiers/validator는 flat leaf organ이며 한 파일이 한 exported function을 소유한다.

## API Contracts

- `createRestructurePlan(snapshot, input): RestructurePlan` — deterministic plan ID, snapshot timestamp, 실행 가능한 moves, alreadyPlaced, unresolved와 summary 반환. 분류 순서는 unresolved → alreadyPlaced → moves다.
- `planMoveInstruction(snapshot, request): MoveInstruction` — 한 request의 normalized source/target, basis, LCA와 decision 상태 계산.
- `buildImportRewrites(snapshot, sourcePath, targetPath, consumerPaths): ImportRewriteBuildResult` — source를 exact하게 가리키는 path-like evidence만 target 기준으로 변환하고 나머지는 decision reason으로 반환.
- `stripPathExtension(path): string` — 마지막 세그먼트의 확장자 하나를 제거한 경로. 디렉터리 구분자, dot-prefixed 이름과 dot만으로 이루어진 상대 마커는 건드리지 않는다.
- `specifierDenotesPath(consumerFile, rawSpecifier, resolvedPath): boolean` — path-like specifier가 stem 기준으로 resolved file을 가리키는지 판정.
- `applySpecifierExtension(candidate, rawSpecifier): string` — 계산된 specifier에 원래 specifier의 확장자 표기를 되돌려 준다.
- `validatePlanPreconditions(snapshot, plan): PlanValidationResult` — project root와 snapshot hash 불일치를 finding으로 반환.
- `validatePlanPostconditions(snapshot, plan): PlanValidationResult` — `moves`와 `alreadyPlaced` 양쪽, 그리고 post snapshot의 boundary·DAG 불일치를 finding으로 반환.

## Acceptance Criteria

### AC-restructure-placement — read-only exact placement

- sibling 둘과 consumer 셋은 true LCA 아래 organ, 단일 consumer는 owner 아래 organ으로 계획된다.
- independent unit은 새 fractal과 intent/detail/entry-point 역할을 가진다.
- unknown contract 또는 의미 이름 부족은 `requiresDecision` unresolved다.
- planning 전후 project file tree는 동일하다.

### AC-restructure-specifier — 생태계 확장자 관례 아래의 exact rewrite

- `.js`로 참조된 `.ts` 소스와 확장자를 생략한 참조는 exact evidence이며 `affectedImports`를 만든다. `import-rewrite-unsupported`가 아니다.
- rewrite된 specifier는 소비자가 쓰던 확장자 표기를 유지한다.
- stem이 일치하지 않는 디렉터리 index 참조는 decision reason으로 남는다.
- 소비자를 가진 move가 이 사유만으로 `unresolved`가 되지 않는다.

### AC-restructure-already-placed — 옮길 것 없는 요청

- 계산된 target이 source와 같은 instruction은 `alreadyPlaced`에만 들어가고 `moves`에는 없다.
- 그 계획의 postcondition은 `source-still-present`를 내지 않되, 유닛이 계획된 경로에 없으면 `target-missing`을 낸다.
- `summary.moveCount`는 그런 요청을 세지 않고 `alreadyPlacedCount`가 센다.
- decision이 필요한 요청은 target이 source와 같아도 `unresolved`에 남는다.

### AC-restructure-validation — 실행 이탈 검출

- stale snapshot은 precondition FAIL이다.
- 남은 source, 누락/다른 target, node type, artifact, entry point, import rewrite/boundary와 cycle 또는 non-exact DAG는 postcondition FAIL이다.

## Last Updated

2026-07-28 — `alreadyPlaced`도 source 부재만 면제하고 exact target·node type·artifact·import rewrite를 요구하며, dot만으로 이루어진 상대 마커를 확장자로 읽지 않는다.
