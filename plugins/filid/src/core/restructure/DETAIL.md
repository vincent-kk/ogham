# restructure — Contract

## Requirements

- `createRestructurePlan`은 입력 snapshot만 읽고 project tree를 변경하지 않는다.
- 생략된 consumer는 source로 향하는 dependency evidence에서 계산한다. 명시적 `consumerPaths`는 배치(LCA)에만 쓰며, import 수정 목록을 거르지 않는다. 목록 밖 소비자의 import도 이동 뒤 깨지기 때문이다. 특히 검증 파일 소비자는 그래프 면제 때문에 postcondition이 잘못 통과한다.
- `contractIntent` 생략값은 `unknown`이며 문서/public-surface evidence가 independent를 확정하지 못하면 unresolved다.
- internal unit은 single owner 또는 lowest common fractal 아래의 의미 organ 후보로, independent unit은 새 fractal 후보로 계획한다.
- 의미 organ 이름, adapter-derived entry path 또는 exact path-like import rewrite가 없으면 추측하지 않고 decision reason을 반환한다.
- specifier가 resolved file을 가리키는지는 **마지막 세그먼트의 확장자를 제거한 형태**로 판정한다. 소스 확장자를 그대로 적을 수 없는 생태계 관례(TypeScript ESM이 `.ts` 파일을 `.js`로 참조, 확장자 생략)를 exact evidence로 인정하기 위해서다. 들어오는 import에서 stem이 다르면(디렉터리 index 참조 등) 여전히 decision reason이다.
- rewrite 결과는 소비자가 쓰던 확장자 표기를 보존한다. core는 어느 확장자가 유효한지 알지 못하며, 원래 specifier의 표기를 그대로 되돌려 준다.
- 계산된 specifier는 항상 path-like다. `../`로 시작하면 그대로 두고, `..`이면 `../`, 빈 문자열이면 `./`, 그 밖은 `./`를 붙인다. 붙이지 않으면 `types.ts` 같은 bare specifier가 되어 package import로 해석된다.
- **`moves`는 실행 순서다.** `moves[i].targetPath`는 그 move를 실행하는 시점의 목적지다. 뒤에 오는 move의 source가 그 경로를 포함하면 함께 옮겨진다.
- 순서 제약 — 다음이면 a를 b보다 먼저 실행한다:
  - 안쪽 source(`a.source ⊊ b.source`): 안쪽이 먼저 빠져나간다.
  - 다른 source 안에 안착하는 target(`a.target ⊊ b.source`): 먼저 안착해서 함께 옮겨진다.
  - 비워진 source로 들어오는 target(`b.target == a.source`): a가 먼저 비운다.
  - 바깥 target을 가진 move가 먼저(`b.target ⊊ a.target`): 바깥 target 디렉터리를 이동으로 먼저 만든다. 안쪽이 먼저 오면 뒤의 디렉터리 이동이 이미 생긴 디렉터리 안으로 중첩된다.
  - 이 제약으로 안정 위상 정렬하고, 동률은 요청 순서로 정한다.
- 자동으로 순서를 정할 수 없는 move만 `move-order-conflict`로 `unresolved`에 둔다. 해당하는 경우는 다음과 같다.
  - 순환 제약의 멤버. 같은 source 중복과, 디렉터리 move가 안쪽 파일을 그 목표로 옮기는 흡수형 중복이 여기에 속한다.
  - 자기 target과 자기 source가 포함 관계인 move.
  - 안쪽 move가 있고, 그 뒤에 옮길 snapshot 파일이 남지 않으며, 다른 move도 그 안에 안착하지 않는 디렉터리 move. 안쪽 move가 없으면 빈 디렉터리 move라도 conflict가 아니다.
  - 순환에 속하지 않은 move는 남긴다.
- **import 수정은 edge마다 정확히 한 move가 싣는다.** 소유권은 실행 가능한 move만으로 정한다.
  - 들어오는 쪽: import 대상을 처음 옮기는 move가 싣는다.
  - 나가는 쪽: 대상이 움직이지 않으면, 가져오는 파일을 처음 옮기는 move가 싣는다.
  - `consumerPath`와 `requiredSpecifier`는 모든 move 뒤의 최종 배치 기준이다. 실행자는 모든 move를 끝낸 뒤 import를 고친다.
  - `alreadyPlaced`와 `unresolved`의 `affectedImports`는 비어 있다.
- import 수정 가능 여부는 두 판정 집합에서 순서·소유권·소비자 목록과 무관하게 판정한다. 그래야 계획 계산의 두 pass가 같은 unresolved/alreadyPlaced/moves 분할을 낸다.
  - 판정은 `sourcePath ≠ targetPath`인 instruction에만 한다. 이미 제자리인 unit은 import가 깨지지 않는다.
  - 들어오는 쪽 판정 집합: source 안으로 향하는 증거 전부.
  - 나가는 쪽 판정 집합: source 안 파일이 source 밖으로 향하는 증거 전부.
  - 나가는 쪽에서는 파일 참조와 디렉터리 참조(대상의 엄밀한 상위 디렉터리를 가리키는 specifier)를 지원한다. 대상이 움직이지 않으므로 디렉터리도 움직이지 않는다.
  - 절대 경로 specifier는 소비자만 움직일 때 깨지지 않으므로 나가는 쪽에서 판정하지 않는다.
- 디렉터리 unit의 내부 파일은 target 디렉터리 기준으로 재배치한다. independent 대상의 entry 치환은 file unit에만 적용한다.
- `consumerPaths`와 LCA는 실행 전 snapshot의 소비자 증거로 계산한다. 소비자의 새 위치는 다른 move의 target에 달려 있고, 그 target은 다시 자기 소비자에 달려 있다. 새 위치로 배치를 다시 계산하면 수렴이 보장되지 않는다.
- 계산된 target이 source와 같으면 옮길 것이 없다. 그런 instruction은 `moves`가 아니라 `alreadyPlaced`로 분리한다. postcondition은 두 갈래를 다르게 본다 — `moves`에는 source 부재까지, `alreadyPlaced`에는 source 부재만 뺀 나머지 전부를 요구한다. 그래야 "source 부재"와 "target 존재"가 같은 경로에 동시에 요구되지 않으면서, 계획 밖 경로에 착지한 유닛도 통과하지 못한다.
- 요청을 조용히 버리지 않는다. 이미 제자리인 유닛도 계산된 LCA·basis·consumer와 남은 required artifact를 그대로 실은 instruction으로 돌려준다.
- validation은 post-execution snapshot만으로 판정한다.
  - target, artifact와 entry point는 뒤따르는 move를 적용한 최종 경로에서 검사한다.
  - source 부재는 원래 경로에서 검사한다. 다른 unit의 최종 target이 그 경로이거나 그 안에 있으면 건너뛴다. 그 경로는 합법적으로 다시 채워진다. source를 감싸는 조상 target은 해당하지 않는다. 그 target이 있어도 빠져나가야 할 원본이 남으면 실패다.
  - import rewrite 대조는 파일 참조와 디렉터리 참조를 인정한다.
  - import boundary와 DAG도 검사한다.
- planner/imports/specifiers/validator는 flat leaf organ이며 한 파일이 한 exported function을 소유한다.

## API Contracts

- `createRestructurePlan(snapshot, input): RestructurePlan` — deterministic plan ID, snapshot timestamp, 실행 순서의 moves, alreadyPlaced, unresolved와 summary를 반환한다. 동작은 다음 순서다.
  1. 첫 계산으로 실행 가능한 후보를 확정한다.
  2. `orderPlannedMoves`로 순서와 conflict를 정한다.
  3. 순서가 정해진 move를 넘겨 rewrite를 다시 계산한다.
- `planMoveInstruction(snapshot, request, orderedMoves?): MoveInstruction` — 한 request의 normalized source/target, basis, LCA와 decision 상태를 계산한다. `orderedMoves`는 rewrite의 최종 경로와 소유권에만 쓰고 target 계산에는 쓰지 않는다.
- `orderPlannedMoves(moves, snapshot): { order: number[]; conflicts: number[] }` — 입력 index 기준 실행 순서와 conflict move.
- `buildImportRewrites(snapshot, unit, orderedMoves?): ImportRewriteBuildResult` — `unit`은 `{ sourcePath, targetPath, rewriteTargetPath }`다. 들어오는·나가는 판정 집합의 decision reason과 이 unit이 소유한 수정을 반환한다. `orderedMoves`가 비면 unit 혼자 실행되는 것으로 본다.
- `relocateThroughMoves(path, orderedMoves, fromIndex?): string` — `fromIndex`부터 순서대로 move를 적용한 최종 경로.
- `stripPathExtension(path): string` — 마지막 세그먼트의 확장자 하나를 제거한 경로. 디렉터리 구분자, dot-prefixed 이름과 dot만으로 이루어진 상대 마커는 건드리지 않는다.
- `specifierDenotesPath(consumerFile, rawSpecifier, resolvedPath): boolean` — path-like specifier가 stem 기준으로 resolved file을 가리키는지 판정.
- `specifierDenotesDirectoryOf(consumerFile, rawSpecifier, resolvedPath): string | null` — path-like specifier가 resolved file의 엄밀한 상위 디렉터리를 가리키면 그 디렉터리를 반환한다.
- `applySpecifierExtension(candidate, rawSpecifier): string` — 계산된 specifier에 원래 specifier의 확장자 표기를 되돌려 준다.
- `validatePlanPreconditions(snapshot, plan): PlanValidationResult` — project root와 snapshot hash 불일치를 finding으로 반환.
- `validatePlanPostconditions(snapshot, plan): PlanValidationResult` — `moves`와 `alreadyPlaced` 양쪽의 최종 경로, 그리고 post snapshot의 boundary·DAG 불일치를 finding으로 반환.

## Acceptance Criteria

### AC-restructure-placement — read-only exact placement

- sibling 둘과 consumer 셋은 true LCA 아래 organ, 단일 consumer는 owner 아래 organ으로 계획된다.
- independent unit은 새 fractal과 intent/detail/entry-point 역할을 가진다.
- unknown contract 또는 의미 이름 부족은 `requiresDecision` unresolved다.
- planning 전후 project file tree는 동일하다.

### AC-restructure-specifier — 생태계 확장자 관례 아래의 exact rewrite

- `.js`로 참조된 `.ts` 소스와 확장자를 생략한 참조는 exact evidence이며 `affectedImports`를 만든다. `import-rewrite-unsupported`가 아니다.
- rewrite된 specifier는 소비자가 쓰던 확장자 표기를 유지한다.
- stem이 일치하지 않는 디렉터리 index 참조는 들어오는 쪽에서 decision reason으로 남는다.
- 소비자를 가진 move가 이 사유만으로 `unresolved`가 되지 않는다.

### AC-restructure-already-placed — 옮길 것 없는 요청

- 계산된 target이 source와 같은 instruction은 `alreadyPlaced`에만 들어가고 `moves`에는 없다.
- 그 계획의 postcondition은 `source-still-present`를 내지 않되, 유닛이 계획된 경로에 없으면 `target-missing`을 낸다.
- `summary.moveCount`는 그런 요청을 세지 않고 `alreadyPlacedCount`가 센다.
- decision이 필요한 요청은 target이 source와 같아도 `unresolved`에 남는다.
- `alreadyPlaced`의 `affectedImports`는 비어 있고, 그 안의 `..` import는 import 판정으로 unresolved를 만들지 않는다.

### AC-restructure-plan-relocation — 같은 계획이 옮기는 소비자와 대상

- 서로 import하는 두 파일을 한 계획으로 옮기면, 옮겨지는 소비자의 rewrite는 새 소비자 경로와 새 디렉터리 기준 specifier를 가진다.
- 그 계획대로 실행한 post snapshot의 postcondition은 finding이 없다.
- 디렉터리 move 안의 소비자는 새 경로에서 기존 상대 specifier를 유지한다.
- 옮겨지는 소비자도 `consumerPaths`에는 실행 전 경로로 남는다.
- 같은 디렉터리로 모이는 target에 대한 specifier는 `./`로 시작한다.
- 옮기는 파일이 옮기지 않는 파일을 가져오는 import(파일 참조, 디렉터리 참조)도 수정 목록에 실린다. 절대 경로 specifier는 수정도 decision reason도 만들지 않는다.
- 명시적 `consumerPaths` 밖의 소비자도 수정 목록에 실린다.
- 끝점이 움직이는 import edge 하나는 계획 전체에서 수정 하나만 가진다.

### AC-restructure-move-order — 겹치는 이동의 자동 실행 순서

- 안쪽 file move는 요청 순서와 무관하게 그 파일을 담은 디렉터리 move보다 먼저 온다.
- 이동하는 디렉터리 안에 안착하는 move가 먼저 오고, postcondition은 최종 경로에서 통과한다.
- 비워진 source로 들어오는 move가 있어도 postcondition은 source 부재로 실패하지 않는다.
- target이 겹치면 바깥 target을 가진 move가 먼저 온다.
- 흡수형 중복, 같은 source 중복, 자기 포함 move, 안쪽 move가 비운 디렉터리 move는 `move-order-conflict`이고, 순환 밖 move는 계획에 남는다.
- `alreadyPlaced` 디렉터리 안에서 빠져나가야 할 원본이 남아 있으면 `source-still-present`다.
- 다른 move가 안착하는 디렉터리 move는 비어도 conflict가 아니다.
- 이동하는 디렉터리 안의 `alreadyPlaced`는 postcondition을 최종 경로에서 통과한다.
- independent 디렉터리 move의 내부 파일 rewrite는 entry 경로로 깨지지 않는다.

### AC-restructure-validation — 실행 이탈 검출

- stale snapshot은 precondition FAIL이다.
- 남은 source, 누락/다른 target, node type, artifact, entry point, import rewrite/boundary와 cycle 또는 non-exact DAG는 postcondition FAIL이다.

## History

- 2026-09-19 — `moves`를 실행 순서로 정하고, import 수정은 끝점이 움직이는 edge마다 정확히 한 move가 최종 배치 기준으로 싣게 했다. 겹치는 이동에서 move마다 따로 계산한 수정이 서로 모순되었다. 옮기는 파일의 나가는 import와 명시적 소비자 목록 밖의 import는 계획에서 빠져 있었다. 자동으로 순서를 정할 수 없는 경우만 `move-order-conflict`로 남겼다. deepest-wins 재배치는 target 쪽 겹침을 표현하지 못해 순차 적용으로 바꿨다.
- 2026-09-19 — rewrite 소비자를 계획 전체 실행 뒤의 위치로 재배치했다. move마다 따로 계산하던 rewrite가 같은 계획으로 옮겨지는 소비자의 옛 경로를 가리켜, 올바르게 실행한 계획이 postcondition에서 실패하고 있었다. LCA 재계산은 target끼리 서로 의존해 수렴을 보장할 수 없어 실행 전 증거에 남겼다.

## Last Updated

2026-09-19
