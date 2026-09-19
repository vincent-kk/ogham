# restructure — Contract

## Requirements

- `createRestructurePlan`은 입력 snapshot과, 계획의 입력인 경로(`readPaths`·`probePaths`)만 읽고 project tree를 변경하지 않는다. `readHash`는 그 경로들의 hash이며 precondition이 같은 경로로 다시 계산해 비교한다. 계획과 무관한 편집이 실행을 막지 않게 하기 위해서다.
  - `readPaths`: move source 안의 파일, source를 import하는 소비자 파일, source가 import하는 파일. 내용 byte를 hash한다. import 요구가 이 파일들에서 나온다.
  - `probePaths`: 각 move의 target 경로, 그리고 프로젝트 루트부터 각 source·target까지의 조상 디렉터리마다 `INTENT.md`·`DETAIL.md`. 상태 `missing | file | directory`를 hash하고 `file`이면 내용도 섞는다. 조상 문서는 분류와 LCA, target 경로는 사전 점유를 정한다. 없던 것이 생기는 것도 불일치다. 상위 성분이 파일이면(ENOTDIR) `missing`으로 읽고, 그 밖의 fs 오류는 올린다. `readPaths`와 겹치면 `readPaths`에만 둔다.
  - 실제 위치가 symlink를 거쳐 root 밖인 probe는 `probePaths`에서 뺀다. snapshot도 그런 symlink를 따라가지 않는다. 그 문서나 target 자리의 변화는 precondition이 보지 못한다. 계획 뒤 probe 경로가 밖으로 가는 symlink로 바뀌면 artifact가 `plan-artifact-invalid`로 거절되고, 새 계획은 그 probe를 빼므로 거절이 풀린다.
  - 두 집합 밖의 입력(예: 조상이 아닌 디렉터리의 문서, config, adapter가 읽는 manifest)의 변화는 precondition이 잡지 못한다. 그런 변화가 계획을 바꾸면 postcondition이 계획 자신의 target만 보므로 드러나지 않을 수 있다.
- 생략된 consumer는 source로 향하는 dependency evidence에서 계산한다. 증거의 `sourceFile`이 source 안에 있으면 소비자가 아니다. unit 안의 파일은 unit과 함께 움직이기 때문이다. 명시적 `consumerPaths`는 그대로 쓰며 배치(LCA)에만 쓰고, import 수정 목록을 거르지 않는다. 목록 밖 소비자의 import도 이동 뒤 깨지기 때문이다. 특히 검증 파일 소비자는 그래프 면제 때문에 postcondition이 잘못 통과한다.
- `contractIntent` 생략값은 `unknown`이며 문서/public-surface evidence가 independent를 확정하지 못하면 unresolved다.
- internal unit은 single owner 또는 lowest common fractal 아래의 의미 organ 후보로, independent unit은 새 fractal 후보로 계획한다.
- 의미 organ 이름이나 adapter-derived entry path가 없으면 추측하지 않고 decision reason을 반환한다. `organNameHint`는 경로 세그먼트 하나여야 한다(`.`·`..`·빈 문자열은 invalid). 새 fractal의 entry 형태는 기존 fractal의 module entry만 후보로 삼고, 후보가 정확히 하나일 때만 요구한다. manifest·executable·framework entry는 분류에 쓰지 않는다.
- decision reason마다 `decisions`에 `{ reason, message, nextAction }`을 같은 순서로 싣는다. `message`는 막힌 이유를 경로와 함께, `nextAction`은 호출자의 다음 단계를 말한다. 판단이 필요하면 사용자에게 묻게 한다.
- import 변경 요구는 해석 결과로 표현한다: `{ consumerPath, currentSpecifier, requiredResolvedPath, suggestedSpecifier? }`. `requiredResolvedPath`는 모든 move 뒤 그 import가 불러야 할 파일이다. 검증은 이 경로만 본다.
- `suggestedSpecifier`는 현재 specifier가 대상 파일(stem 기준) 또는 그 엄밀한 상위 디렉터리를 가리키는 path-like 형태일 때만 싣는 제안이다. 검증에 쓰지 않는다. stem은 **마지막 세그먼트의 확장자를 제거한 형태**다. 소스 확장자를 그대로 적을 수 없는 생태계 관례(TypeScript ESM이 `.ts` 파일을 `.js`로 참조, 확장자 생략)를 제안에 반영하기 위해서다.
- 제안은 소비자가 쓰던 확장자 표기를 보존한다. core는 어느 확장자가 유효한지 알지 못하며, 원래 specifier의 표기를 그대로 되돌려 준다.
- 제안된 specifier는 항상 path-like다. `../`로 시작하면 그대로 두고, `..`이면 `../`, 빈 문자열이면 `./`, 그 밖은 `./`를 붙인다. 붙이지 않으면 `types.ts` 같은 bare specifier가 되어 package import로 해석된다.
- **`moves`는 실행 순서다.** `moves[i].targetPath`는 그 move를 실행하는 시점의 목적지다. 뒤에 오는 move의 source가 그 경로를 포함하면 함께 옮겨진다.
- 순서 제약 — 다음이면 a를 b보다 먼저 실행한다:
  - 안쪽 source(`a.source ⊊ b.source`): 안쪽이 먼저 빠져나간다.
  - 다른 source 안에 안착하는 target(`a.target ⊊ b.source`): 먼저 안착해서 함께 옮겨진다.
  - 비워진 source로 들어오는 target(`b.target == a.source`): a가 먼저 비운다.
  - 바깥 target을 가진 move가 먼저(`b.target ⊊ a.target`): 바깥 target 디렉터리를 이동으로 먼저 만든다. 안쪽이 먼저 오면 뒤의 디렉터리 이동이 이미 생긴 디렉터리 안으로 중첩된다.
  - 이 제약으로 안정 위상 정렬하고, 동률은 요청 순서로 정한다.
- 자동으로 순서를 정할 수 없는 move만 `move-order-conflict`로 `unresolved`에 두고, 원인과 관련 move는 `decisions` 문장이 밝힌다. 순환에 속하지 않은 move는 남긴다.
  - 순환 멤버는 순환 그룹 단위로 원인을 받는다: source 중복은 `duplicate`, 그룹 안 move가 그룹이 아직 점유한 경로에 착지하면 `swap`(분할해도 덮어쓰므로 사용자에게 묻는다), 그 밖은 `cycle`이다. `cycle`은 다른 source를 모두 포함하는 source(없으면 경로 순서상 첫 source)의 move를 먼저 단독 실행하게 한다.
  - `nested`: 순환 밖에서 target과 source가 포함 관계인 move.
  - `emptied`: 안쪽 move가 snapshot 파일을 모두 옮기고 다른 move가 안착하지 않는 디렉터리 move. filid가 보지 못하는 파일(dot-prefixed, symbolic link, git-ignored, 제외 디렉터리)은 호출자가 확인하게 한다.
- **import 수정은 edge마다 정확히 한 move가 싣는다.** 소유권은 실행 가능한 move만으로 정한다.
  - 들어오는 쪽: import 대상을 처음 옮기는 move가 싣는다.
  - 나가는 쪽: 대상이 움직이지 않으면, 가져오는 파일을 처음 옮기는 move가 싣는다.
  - `consumerPath`, `requiredResolvedPath`, `suggestedSpecifier`는 모든 move 뒤의 최종 배치 기준이다. 실행자는 모든 move를 끝낸 뒤 import를 고친다.
  - `alreadyPlaced`와 `unresolved`의 `affectedImports`, `preservedImports`는 비어 있다.
  - 판정은 `sourcePath ≠ targetPath`인 instruction에만 한다. 이미 제자리인 unit은 import가 깨지지 않는다.
  - 나가는 쪽에서는 파일 참조와 디렉터리 참조(대상의 엄밀한 상위 디렉터리를 가리키는 specifier)에 제안을 싣는다. 대상이 움직이지 않으므로 디렉터리도 움직이지 않는다.
  - 절대 경로 specifier는 소비자만 움직일 때 깨지지 않으므로 나가는 쪽에서 판정하지 않는다.
- **filid가 제안을 합성할 수 없는 import도 `affectedImports`에 `suggestedSpecifier` 없이 싣는다.** 대상은 stem이 다른 들어오는 참조(디렉터리 index, bare `.`/`..`)와 파일·디렉터리 참조가 아닌 나가는 참조다. 호출자가 specifier를 쓴다. import는 계획의 분할에 영향을 주지 않는다.
  - 제안이 없는 참조 중 소비자에서 대상까지의 상대 경로가 이동 뒤에도 같으면 `preservedImports`에 같은 모양(`suggestedSpecifier` 없음)으로 싣는다(디렉터리 move 안쪽끼리의 참조). 호출자는 고치지 않는다.
- 디렉터리 unit의 내부 파일은 target 디렉터리 기준으로 재배치한다. independent 대상의 entry 치환은 file unit에만 적용한다.
- `consumerPaths`와 LCA는 실행 전 snapshot의 소비자 증거로 계산한다. 소비자의 새 위치는 다른 move의 target에 달려 있고, 그 target은 다시 자기 소비자에 달려 있다. 새 위치로 배치를 다시 계산하면 수렴이 보장되지 않는다.
- 계산된 target이 source와 같으면 옮길 것이 없다. 그런 instruction은 `moves`가 아니라 `alreadyPlaced`로 분리한다. postcondition은 두 갈래를 다르게 본다 — `moves`에는 source 부재까지, `alreadyPlaced`에는 source 부재만 뺀 나머지 전부를 요구한다. 그래야 "source 부재"와 "target 존재"가 같은 경로에 동시에 요구되지 않으면서, 계획 밖 경로에 착지한 유닛도 통과하지 못한다.
- 요청을 조용히 버리지 않는다. 이미 제자리인 유닛도 계산된 LCA·basis·consumer와 남은 required artifact를 그대로 실은 instruction으로 돌려준다.
- validation은 post-execution snapshot만으로 판정한다.
  - target, artifact와 entry point는 뒤따르는 move를 적용한 최종 경로에서 검사한다.
  - source 부재는 원래 경로에서 검사한다. 다른 unit의 최종 target이 그 경로와 같으면 건너뛴다. 그 경로는 합법적으로 다시 채워진다. 최종 target이 source **안**에 있으면 그 target 밖에 남은 파일·디렉터리만 `source-still-present`다. source를 감싸는 조상 target은 해당하지 않는다. 그 target이 있어도 빠져나가야 할 원본이 남으면 실패다.
  - import 요구는 해석 결과로만 검사한다. 문자열·stem·디렉터리 포함 비교는 하지 않는다.
    - 두 종류가 같은 술어를 쓴다: 소비자의 참조 하나 이상이 `requiredResolvedPath`로 해석되고, `currentSpecifier`로 남은 참조는 **전부** `requiredResolvedPath`이거나 계획 전체가 같은 소비자에게 요구한 다른 파일(다른 affected·preserved 요구의 `requiredResolvedPath`)로 해석되며(없어도 된다), 그 specifier가 `unresolved-local-dependency`로 남아 있지 않아야 한다. 그 밖의 프로젝트 안 파일로 해석되면 실패다. 호출자가 쓴 specifier는 따지지 않는다.
    - 다른 요구의 허용이 필요한 이유: 재점유 맞교환(파일 A가 경로 P를 비우고, 파일 B가 P로 들어오는 두 move)에서 B의 rewrite가 첫 요구의 `currentSpecifier`와 같은 문자열을 정당하게 새로 쓴다.
    - 한계: 같은 소비자가 unit을 같은 specifier로 두 번 참조하고 그 문자열로 해석될 다른 파일도 요구받을 때, 참조 하나를 고치지 않은 상태와 정상 실행은 해석 결과가 같아 구분되지 않고 통과한다.
    - 어기면 `affectedImports`는 `import-rewrite-missing`, `preservedImports`는 `preserved-import-broken`이다. message는 unresolved, 다른 파일로 해석되는 `currentSpecifier` 참조, 요구 파일을 읽는 참조 없음 순으로 하나를 말한다.
    - 실패의 nextAction은 두 갈래를 말한다: 그 import를 고치거나, 보고된 참조가 소비자에 실제로 없으면(주석·문자열 안) 의존성 분석이 틀린 것이므로 파일을 고치지 말고 사용자에게 보고한다.
    - 검증 파일은 그래프 certainty에서 면제되므로 진단 검사가 깨진 옛 import를 드러낸다.
  - 요구된 entry point가 있어도 adapter가 surface를 `unsupported`로 보고하면 `entry-point-surface-unsupported`다. 그 entry point가 unit을 노출하는지 확인할 수 없기 때문이다.
  - target 경로가 없거나, 디렉터리 unit(`unitKind`가 `file`이 아님)인데 target 노드가 없으면(같은 이름의 일반 파일만 있는 경우) `target-missing`이다. 그때 node type·artifact 검사는 생략된다. file unit의 target 노드는 부모 디렉터리이므로, target 파일이 있으면 노드도 있다.
  - import boundary와 DAG도 검사한다.
- 모든 validation finding은 경로·specifier를 담은 `message`와 `nextAction`을 싣는다. boundary finding은 규칙 위반의 `message`와 `suggestion`을 쓴다.
- planner/imports/specifiers/validator는 flat leaf organ이며 한 파일이 한 exported function을 소유한다.

## API Contracts

- `createRestructurePlan(snapshot, input): RestructurePlan` — deterministic plan ID, snapshot timestamp, 실행 순서의 moves, alreadyPlaced, unresolved와 summary를 반환한다. 동작은 다음 순서다.
  1. 첫 계산으로 실행 가능한 후보를 확정한다.
  2. `orderPlannedMoves`로 순서와 conflict를 정한다.
  3. 순서가 정해진 move를 넘겨 rewrite를 다시 계산하고, conflict move에 원인별 결정을 붙인다.
- `planMoveInstruction(snapshot, request, orderedMoves?): MoveInstruction` — 한 request의 normalized source/target, basis, LCA, decision 상태와 `decisions`를 계산한다. `orderedMoves`는 import 요구의 최종 경로와 소유권에만 쓰고 target 계산에는 쓰지 않는다.
- `describeDecision(reason, context): RestructureDecision` — `move-order-conflict`를 뺀 decision reason 하나의 message와 nextAction.
- `orderPlannedMoves(moves, snapshot): { order: number[]; conflicts: OrderConflict[] }` — 입력 index 기준 실행 순서와, index 오름차순의 conflict(`{ index, cause, related }`).
- `markOrderConflict(move, cause, relatedSources): MoveInstruction` — conflict move를 unresolved로 바꾸고 `move-order-conflict` 결정을 원인별 문장으로 붙인다.
- `buildImportRewrites(snapshot, unit, orderedMoves?): ImportRewriteBuildResult` — `unit`은 `{ sourcePath, targetPath, rewriteTargetPath }`다. 이 unit이 소유한 `required`(제안이 있거나 없는 변경 요구)와 `preserved`를 반환한다. `orderedMoves`가 비면 unit 혼자 실행되는 것으로 본다.
- `collectPlanReadPaths(snapshot, moves): string[]` — `readPaths`(source 파일, 소비자, source가 import하는 파일)를 정렬해 중복 없이 반환한다.
- `collectPlanProbePaths(projectRoot, moves, readPaths): string[]` — `probePaths`(target 경로, source·target 조상 디렉터리의 `INTENT.md`·`DETAIL.md`)에서 `readPaths`와 겹치는 것을 뺀 정렬·중복 없는 목록.
- `computePlanReadHash(projectRoot, readPaths, probePaths): string` — `readPaths`의 byte와 `probePaths`의 상태(`missing | file | directory`, file이면 내용)로 `readHash`를 계산한다. 계획과 precondition이 같은 함수를 쓴다. 두 목록 모두 `resolveHashFile`의 root containment를 거치므로 경로 문자열이 root 밖이면 읽기 전에 던진다. 이 함수 자체는 symlink를 따라가므로, symlink를 거친 탈출은 호출 전에 막아야 한다: 계획은 그런 probe를 싣지 않고, plan artifact reader는 그런 경로가 있는 artifact를 거절한다.
- `isPhysicallyWithin(projectRoot, path): boolean` — 경로 위의 symlink를 모두 따라간 실제 위치가 root의 실제 위치 안인지 판정한다. 존재하지 않는 suffix는 그 앞의 링크로 판정하고, 중간 성분이 파일이면(ENOTDIR) 해석되는 가장 가까운 조상으로 판정한다. symlink loop(ELOOP)는 안에 있다고 확인할 수 없으므로 밖으로 본다: reader는 거절하고 planner는 그 probe를 뺀다. `@ogham/cross-platform`의 `canonicalizeTargetPathSync`를 쓴다. entry point로 공개되며 MCP plan artifact reader가 쓴다.
- `listAncestorDirectories(projectRoot, path): string[]` — path의 부모부터 project root까지의 디렉터리.
- `isMissingPathError(error): boolean` — ENOENT·ENOTDIR 판정.
- `isDirectoryReadError(error): boolean` — EISDIR 판정. precondition만 쓴다.
- `isSymlinkLoopError(error): boolean` — ELOOP 판정.
- `sortUniquePaths(paths): string[]` — `pathForCompare`로 중복을 없애고 정렬한다.
- `relocateThroughMoves(path, orderedMoves, fromIndex?): string` — `fromIndex`부터 순서대로 move를 적용한 최종 경로.
- `stripPathExtension(path): string` — 마지막 세그먼트의 확장자 하나를 제거한 경로. 디렉터리 구분자, dot-prefixed 이름과 dot만으로 이루어진 상대 마커는 건드리지 않는다.
- `specifierDenotesPath(consumerFile, rawSpecifier, resolvedPath): boolean` — path-like specifier가 stem 기준으로 resolved file을 가리키는지 판정. 제안 합성에만 쓴다.
- `specifierDenotesDirectoryOf(consumerFile, rawSpecifier, resolvedPath): string | null` — path-like specifier가 resolved file의 엄밀한 상위 디렉터리를 가리키면 그 디렉터리를 반환한다. 제안 합성에만 쓴다.
- `applySpecifierExtension(candidate, rawSpecifier): string` — 계산된 specifier에 원래 specifier의 확장자 표기를 되돌려 준다.
- `validatePlanPreconditions(snapshot, plan): PlanValidationResult` — project root가 다르면 아무것도 읽지 않고 `project-root-mismatch` 하나만 반환한다. 같으면 `readPaths`·`probePaths`로 다시 계산한 hash와 `readHash`의 불일치(`snapshot-hash-mismatch`)와 unresolved 요청을 finding으로 반환한다. read path의 조상이 일반 파일이 되거나 사라지거나(ENOTDIR·ENOENT) read path가 디렉터리가 되어도(EISDIR) `snapshot-hash-mismatch`이고, 그 밖의 fs 오류는 던진다.
- `validatePlanPostconditions(snapshot, plan): PlanValidationResult` — `moves`와 `alreadyPlaced` 양쪽의 최종 경로, import 요구와 보존 import의 해석 결과, 그리고 post snapshot의 boundary·DAG 불일치를 finding으로 반환.
- `validateImportRequirements(snapshot, move, requiredLoads): PlanValidationFinding[]` — 한 move의 `affectedImports`와 `preservedImports`를 post snapshot의 해석 결과로 검사한다.
- `findImportMiss(snapshot, entry, requiredLoads): ImportMiss | null` — 두 종류의 요구가 함께 쓰는 술어. 성립하면 null, 아니면 unresolved 여부와 다른 파일로 해석되는 `currentSpecifier` 참조를 반환한다.
- `collectRequiredLoads(moves): RequiredLoads` — 최종 경로의 요구에서 소비자별 요구 파일 집합을 한 번 계산한다.

## Acceptance Criteria

### AC-restructure-placement — read-only exact placement

- sibling 둘과 consumer 셋은 true LCA 아래 organ, 단일 consumer는 owner 아래 organ으로 계획된다.
- independent unit은 새 fractal과 intent/detail/entry-point 역할을 가진다.
- unknown contract 또는 의미 이름 부족은 `requiresDecision` unresolved다.
- planning 전후 project file tree는 동일하다.

### AC-restructure-specifier — 생태계 확장자 관례와 호출자 위임

- `.js`로 참조된 `.ts` 소스와 확장자를 생략한 참조는 `suggestedSpecifier`가 있는 `affectedImports`를 만든다.
- 제안된 specifier는 소비자가 쓰던 확장자 표기를 유지한다.
- stem이 일치하지 않는 디렉터리 index 참조는 `suggestedSpecifier` 없이 `affectedImports`에 실리고 move는 실행 가능하다. 디렉터리 move 안쪽끼리의 참조는 `preservedImports`에 실린다.
- 그 import를 고친 post snapshot은 finding이 없다. 보존 import를 index 파일을 명시해 고쳐도 요구 파일로 해석되면 finding이 없다. 고치지 않거나 옛 specifier 참조가 남아 다른 파일로 해석되면 `import-rewrite-missing`, 보존 import가 가로채이면 `preserved-import-broken`이 난다.

### AC-restructure-already-placed — 옮길 것 없는 요청

- 계산된 target이 source와 같은 instruction은 `alreadyPlaced`에만 들어가고 `moves`에는 없다.
- 그 계획의 postcondition은 `source-still-present`를 내지 않되, 유닛이 계획된 경로에 없으면 `target-missing`을 낸다.
- `summary.moveCount`는 그런 요청을 세지 않고 `alreadyPlacedCount`가 센다.
- decision이 필요한 요청은 target이 source와 같아도 `unresolved`에 남는다.
- `alreadyPlaced`의 `affectedImports`는 비어 있고, 그 안의 `..` import는 unresolved를 만들지 않는다.

### AC-restructure-plan-relocation — 같은 계획이 옮기는 소비자와 대상

- 서로 import하는 두 파일을 한 계획으로 옮기면, 옮겨지는 소비자의 rewrite는 새 소비자 경로와 새 디렉터리 기준 specifier를 가진다.
- 그 계획대로 실행한 post snapshot의 postcondition은 finding이 없다.
- 디렉터리 move 안의 소비자는 새 경로에서 기존 상대 specifier를 유지한다.
- 옮겨지는 소비자도 `consumerPaths`에는 실행 전 경로로 남는다.
- 같은 디렉터리로 모이는 target에 대한 specifier는 `./`로 시작한다.
- 옮기는 파일이 옮기지 않는 파일을 가져오는 import(파일 참조, 디렉터리 참조)도 수정 목록에 실린다. 절대 경로 specifier는 import 요구를 만들지 않는다.
- 명시적 `consumerPaths` 밖의 소비자도 수정 목록에 실린다.
- 끝점이 움직이는 import edge 하나는 계획 전체에서 수정 하나만 가진다.

### AC-restructure-move-order — 겹치는 이동의 자동 실행 순서

- 안쪽 file move는 요청 순서와 무관하게 그 파일을 담은 디렉터리 move보다 먼저 온다.
- 이동하는 디렉터리 안에 안착하는 move가 먼저 오고, postcondition은 최종 경로에서 통과한다.
- 비워진 source로 들어오는 move가 있어도 postcondition은 source 부재로 실패하지 않는다.
- target이 겹치면 바깥 target을 가진 move가 먼저 온다.
- 흡수형 중복, 같은 source 중복, 교환, 자기 포함 move, 안쪽 move가 비운 디렉터리 move는 `move-order-conflict`이고, 순환 밖 move는 계획에 남는다.
- `alreadyPlaced` 디렉터리 안에서 빠져나가야 할 원본이 남아 있으면 `source-still-present`다.
- 다른 move가 안착하는 디렉터리 move는 비어도 conflict가 아니다.
- 이동하는 디렉터리 안의 `alreadyPlaced`는 postcondition을 최종 경로에서 통과한다.
- independent 디렉터리 move의 내부 파일 rewrite는 entry 경로로 깨지지 않는다.

### AC-restructure-guidance — 결정·충돌·finding의 다음 행동

- `move-order-conflict`를 뺀 모든 decision reason과 conflict 원인 다섯은 각자 비지 않은 message와 nextAction을 가진다. 착지 관계가 한 쌍에만 있는 3-move 순환의 멤버는 모두 `swap`이고, `emptied`는 filid가 보지 못하는 제외 디렉터리를 확인하게 한다.
- 루트 manifest entry가 있어도 independent 요청은 module entry artifact를 가진다. 내부 import가 있는 디렉터리 unit은 외부 소비자의 owner 아래로 계획된다.
- 대표 finding(`import-rewrite-missing`, `target-missing`, `snapshot-hash-mismatch`)의 nextAction은 행동에 필요한 specifier·경로·새 계획을 담는다.

### AC-restructure-validation — 실행 이탈 검출

- 계획이 읽은 파일이 바뀌거나, target 자리가 점유되거나, source·target 조상의 `INTENT.md`·`DETAIL.md`가 생기거나 바뀌면 precondition FAIL이다. 두 집합 밖 파일의 편집은 precondition을 막지 않는다.
- 다른 project root의 계획은 아무 파일도 읽지 않고 `project-root-mismatch`만 받는다.
- 남은 source, 누락/다른 target, node type, artifact, entry point, import 요구/보존/boundary와 cycle 또는 non-exact DAG는 postcondition FAIL이다.
- 요구된 파일이 아닌 곳으로 해석되는 import(같은 이름의 파일이 디렉터리 index를 가로채거나 디렉터리의 다른 파일로 해석)는 specifier가 제안과 같아도 FAIL이다. 제안과 다르게 썼어도 요구된 파일로 해석되면 통과한다.
- 다른 move가 source 안쪽에 착지해도, 그 target 밖에 남은 원본은 `source-still-present`다.
- surface가 `unsupported`인 요구 entry point는 `entry-point-surface-unsupported`다.

## History

- 2026-09-20 — import 변경 요구를 `requiredResolvedPath`로 표현하고 postcondition을 해석 결과로만 판정하게 했다. 문자열·stem·디렉터리 포함 비교는 같은 이름의 파일이 디렉터리 index를 가로채거나 디렉터리의 다른 파일로 해석돼도 통과시켰고, 올바르게 해석되지만 제안과 다르게 쓴 import는 막았다. rewrite와 위임을 `affectedImports` 하나로 합치고 합성 가능한 경우에만 `suggestedSpecifier`를 싣는다. 변경·보존 요구는 한 술어로 판정한다. 남은 옛 specifier 참조가 계획이 요구하지 않은 파일로 해석되면 하나를 고쳐도 통과하던 가림을 막고, 보존 import를 index 파일 명시로 고친 경우를 통과시킨다. precondition hash를 계획의 입력(읽은 파일과, 배치를 정한 조상 문서·target 경로의 상태)으로 한정하고, 디렉터리 unit의 target이 일반 파일로 존재할 때와 source 안쪽 재점유 시 남은 원본과 surface를 확인할 수 없는 entry point를 finding으로 바꿨다. root가 다른 계획은 아무것도 읽지 않게 하고, symlink로 root를 벗어나는 probe를 계획에서 빼고, read path 조상이 파일로 바뀐 경우를 예외 대신 `snapshot-hash-mismatch`로 바꿨다.
- 2026-09-19 — 다시 쓸 수 없는 import를 호출자에게 위임하고 해석 결과로 검증하게 했다. 디렉터리 index 참조 하나가 move 전체를 unresolved로 두어 계획 전체가 멈추었고, 이동 뒤에도 그대로 유효한 디렉터리 참조까지 막혔다. 결정 사유, 순서 충돌 원인과 validation finding마다 다음 행동 문장을 붙였다. entry 형태 후보를 module entry로 한정하고, 그래프에서 소비자를 찾을 때 unit 자신의 파일을 빼고, `organNameHint` `.`을 거절했다.
- 2026-09-19 — `moves`를 실행 순서로 정하고, import 수정은 끝점이 움직이는 edge마다 정확히 한 move가 최종 배치 기준으로 싣게 했다. 겹치는 이동에서 move마다 따로 계산한 수정이 서로 모순되었다. 옮기는 파일의 나가는 import와 명시적 소비자 목록 밖의 import는 계획에서 빠져 있었다. 자동으로 순서를 정할 수 없는 경우만 `move-order-conflict`로 남겼다. deepest-wins 재배치는 target 쪽 겹침을 표현하지 못해 순차 적용으로 바꿨다.
- 2026-09-19 — rewrite 소비자를 계획 전체 실행 뒤의 위치로 재배치했다. move마다 따로 계산하던 rewrite가 같은 계획으로 옮겨지는 소비자의 옛 경로를 가리켜, 올바르게 실행한 계획이 postcondition에서 실패하고 있었다. LCA 재계산은 target끼리 서로 의존해 수렴을 보장할 수 없어 실행 전 증거에 남겼다.

## Last Updated

2026-09-20
