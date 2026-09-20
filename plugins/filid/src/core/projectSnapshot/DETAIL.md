# projectSnapshot contract

## Requirements

- Reference, entry-surface and verification evidence comes from the facts store, read once per snapshot and classified with the same function the `facts` tool reports from, so analysis and `status` cannot disagree about a file. An adapter is never asked to fill a file the store does not hold: filling it would hide a missing bootstrap and change behaviour the day the adapter is removed.
- Dependency diagnostics carry stable consumer/specifier cause identity, the unresolved specifier, and explicit dependencies/boundaries impact. Value/type imports of the same target share an identity. Independent verification remains exact when its own evidence is exact.
- Every diagnostic declares `affects`, the analysis axes (`dependencies`, `boundaries`, `verification`) whose conclusions it can change; `[]` means none. A producer narrows the list only where the code shows the other axes cannot change: dependency references affect dependencies and boundaries; entry-point surface failures affect boundaries (entry-point and node rules have no axis of their own); adapter selection, structure ownership and verification discovery failures affect all three, since classification and the verification set feed every axis.
- The document-contract messages (a missing INTENT.md or DETAIL.md, a stale path token) name the node by its project-root-relative POSIX path, `.` for the root, so the review candidates built from them hash the same wherever the repository sits. Evidence diagnostics keep absolute paths in their messages; they are not hashed.
- Every diagnostic carries a `nextAction`, stated by its producer. A dependency graph that is not exact always has an explaining diagnostic: every file it lists in `unknownFiles` carries its facts state as the cause (`facts-missing`, `facts-needs-resolution`, `facts-uncertain`, `facts-tool-error`), plus the causes the collector attributes outside the records. An `exact` file whose record resolves a reference nowhere still reaches the graph with a null target, so `unresolved-local-dependency` names a file the graph lists in `unknownFiles` with that code as a cause. `unowned-local-dependency` is the exception: a reference with no owning fractal at one of its ends has no node to hang on, so it carries no edge, no cycle and no `unknownFiles` entry — it is reported as a finding naming its source file and its owner-less target, judged with the graph builder's own order and exemptions.

- 등록된 structure/verification adapter와 config v2로 하나의 `ProjectSnapshot`을 만든다.
- 호출자는 수집할 증거 축(entry surface, dependency, verification)을 고를 수 있고 기본값은 전부 수집이다. tree와 문서 증거는 축이 아니라 언제나 수집한다 — 나머지 축이 그 위에서만 의미를 갖기 때문이다.
- 수집하지 않은 축은 빈 값에 `unsupported` certainty로 남고, 무엇을 수집했는지는 `collectedAxes`가 말한다. 빈 결과와 미수집을 구분하는 근거는 이 필드 하나이며, 이를 읽지 않고 축을 신뢰하는 소비자는 계약을 어긴 것이다.
- 축 선택은 snapshot hash 입력에 포함한다. 축이 다른 두 snapshot이 같은 hash를 갖지 않는다.
- dependency 수집기는 파일 상태(스펙 §3)를 `unknownFiles`로 귀속해 graph builder에 넘기고, 참조 밖에서 찾은 불확실성도 같은 목록에 얹는다: adapter ownership 진단(`ambiguous-adapter-claim`, `unsupported`), structure adapter가 따라가지 않은 symlink(`symlink-not-followed`). `exact` 파일만 간선을 내며, 유효 참조는 레코드의 참조와 부속 표에서 `adopt`된 항목의 합이다(스펙 §4.5). 범위 밖(`unsupported`) 파일은 참조 기반 규칙을 건너뛰고 **개수 필드**(`ProjectSnapshot.filesOutsideFactsScope`, 0일 때도 있다)로 보고한다 — "보지 않았다"와 "없었다"를 구별하지 못하면 부재가 pass로 읽힌다. 세는 식은 **기본 범위(adapter 소스 확장자)가 덮었을 파일 중 선언된 범위(`facts.covers`·`facts.excludes`)가 뺀 것**이다 — 문서·설정 파일처럼 애초에 참조 사실의 대상이 아닌 파일까지 세면 설정 없는 모든 프로젝트에서 0이 아니게 되어 읽는 쪽이 건너뛰는 상시 문장이 된다. 선언된 한계: 기본 확장자 밖 언어는 `facts.covers`로 선언해야 범위에 들어오고, 선언하지 않은 그런 파일은 이 개수에 들지 않는다. 진단이 아닌 이유: 결론을 바꾸지 않는데 거의 모든 프로젝트에 상시 뜨는 진단은 읽는 쪽이 진단 목록 자체를 건너뛰게 만든다. hash 입력에도 넣지 않는다.
- 수집기 자체의 certainty는 선언된 범위가 아무것도 덮지 않을 때(`facts.covers: []`) `unsupported`이고 `facts-uninitialized` 진단 하나를 남기며, 그 밖에는 `exact`다. adapter의 유무는 참조의 출처를 정하지 않으므로 certainty를 바꾸지 않는다.
- entry point surface는 그 파일의 레코드 `entrySurface`에서 읽는다. manifest entry point만 예외로 adapter가 manifest를 판독한다 — 소스 해석이 아니라 선언된 표면을 읽는 일이고, manifest는 기본 facts 범위 밖이다. 레코드가 없거나 `exact`가 아니거나 `entrySurface`를 담지 않으면 surface는 `indeterminate`(범위 밖이면 `unsupported`)이고 `entry-point-facts-unavailable` 진단이 다음 행동을 싣는다 — 빈 exact surface로 접히지 않는다.
- snapshot은 `normalizedFacts`로 파일별 유효 참조를 함께 싣는다: 프로젝트 안으로 해석된 `(sourceText ?? specifier, kind, resolvedPath)`를 정렬한 목록과 적용된 판정. **facts 범위 안 스캔 파일마다 항목이 있고, 간선이 없으면 빈 목록이다** — 범위 안에서 "보고 나니 없었다"와 범위 밖이라 "애초에 보지 않았다"는 다른 사실이고, 항목의 있고 없음이 그 둘을 가른다. 범위 밖(`unsupported`) 파일은 항목이 없다. 리뷰가 자기가 판단한 사실을 동결할 때(스펙 §9) 저장소를 다시 읽지 않게 하려는 것이며 — 두 번 읽으면 다른 답이 나올 수 있다 — snapshot hash 입력은 아니다.
- verification의 role과 case count는 레코드 `verification`에서 읽는다. 어떤 파일이 verification인지는 adapter의 discovery(이름·경로)가 정하고, 그 파일에 쓸 수 있는 레코드가 없으면 파일은 분석에서 빠지되 verification certainty가 `indeterminate`가 되고 `verification-facts-unavailable` 진단이 그 경로를 싣는다.
- adapter는 이 단계에서 **대조용**이다. `compareAdapterEvidence` 옵션을 켠 호출만 같은 파일에 adapter를 한 번 더 돌려 결론을 비교하고, 다르면 `facts-adapter-divergence`(`affects: []`, 막지 않음)를 낸다. 환경 변수도 설정 키도 없다 — 제품 경로가 모든 파일을 두 번 파싱하는 비용을 사용자에게 지우지 않기 위해서다. 비교 대상은 facts가 실제로 주장하는 집합, 즉 `exact` 파일뿐이고, 루트 밖으로 해석되는 adapter 참조는 공급자가 `{ external }`로 내는 것과 같은 규칙으로 정규화해 제외한다. 이 옵션과 그 모듈은 adapter와 함께 S4에서 사라진다.
- symlink는 따라가지 않는다. 실제 위치가 project root 밖인 symlink(adapter가 소스로 볼 파일, 또는 디렉터리)는 `symlink-not-followed` 진단(`affects: ['dependencies', 'boundaries']`)과 `unknownFiles` 항목이 된다. 진단의 다음 행동은 먼저 정확한 설정 편집을 말한다: `structure.additionalExcludedDirectories`에 링크 이름을 그대로 넣으면 그 링크는 목록에서 빠진다. 사용자 동의가 필요한 갈래(링크를 실제 파일로 바꾸거나 옮기기)는 그 뒤에 둔다. 내용은 읽지 않는다. root 안을 가리키는 symlink는 대상이 이미 그 실제 경로로 분석되므로 싣지 않는다. 끊어진 symlink와 loop는 분석할 내용이 없으므로 싣지 않는다.
- snapshot hash 입력의 dependency graph에서는 `unknownFiles`를 뺀다. 그 목록은 hash에 이미 들어가는 `diagnostics`의 경로와 코드로 정해진다. 그래서 목록을 도입해도 같은 프로젝트의 hash가 바뀌지 않는다.
- snapshot은 tree, owner-level dependency graph, verification, adapter IDs, diagnostics, output language, legacy criteria evidence와 content-derived hash를 함께 가진다.
- ambiguous/unsupported ownership, unresolved local dependency와 문서 위반은 숨기지 않는다.
- 문서 evidence 수집이 두 파생 검사를 함께 낸다: 존재 주장 형태(말미 `/` 디렉터리 표기 또는 basename에 `.`)이고 home(`~`)·변수(`$`) 표기가 아닌 상대 경로 토큰이 해석 기준 어디에서도 존재하지 않으면 `stale-path` warning, INTENT 한 섹션이 직계 children(4개 이상일 때) 절반 이상을 나열하면 `derivable-structure` warning. 해석 기준은 node 디렉터리부터 project root까지의 조상 체인이되 `..` 포함 토큰은 node 디렉터리 하나뿐이고, 말미 `/` 토큰은 디렉터리로만 충족된다. 면책 섹션·`## History`·`## Last Updated`·`## Dependencies`·fence 내부는 제외하고, 같은 섹션에 `derivable-structure`가 있으면 그 섹션의 `derivable-content`를 대체한다(구체 규칙 우선).
- structure/verification detect와 discovery는 adapter마다 한 번 수행하고 portable absolute path claim으로 정규화해 분석에 전달한다.
- tree entry evidence는 확정된 structure ownership만 사용하고 adapter별 entry override를 해당 adapter에 전달한다.
- config `maxDepth`는 validation 한계이며 snapshot tree traversal을 자르지 않는다.
- config `structure.additionalExcludedDirectories`는 tree scan과 adapter ownership 해석에 **같은 실행에서 같은 값으로** 전달한다. 한쪽만 받으면 node가 아닌 파일이 dependency 증거에 남아 graph certainty를 미확정으로 만든다 — 두 소비처가 갈리지 않게 하는 것이 이 orchestration의 책임이다.
- DETAIL.md가 `## Boundary Exemptions`를 선언하면 그 항목을 `node.documentEvidence.boundaryExemptions`에 보존한다. `targetPath`는 소유 프랙탈 기준으로 정규화한 절대 경로이며, rule engine은 다시 파일을 읽지 않고 이 evidence만 읽는다.
- dependency graph는 non-organ owner path와 함께 organ path 목록도 받아, owner subtree 안의 owned-organ 참조를 cycle adjacency에서 제외한다.
- 동일 bytes와 구조는 프로젝트 absolute root 및 mtime과 무관하게 같은 hash이고 file content 또는 구조 입력 변경은 hash를 바꾼다.
- root에 legacy acceptance ledger가 없으면 `legacyCriteriaLedger`는 `null`이다.
- root에 legacy acceptance ledger가 있으면 absolute ledger path와 migration target인 root `DETAIL.md` absolute path를 보존하고 ledger content를 snapshot hash에 포함한다.

## API Contracts

- `createProjectSnapshot(projectRoot, registry, config, options?): Promise<ProjectSnapshot>` — read-only snapshot을 생성한다. `options.axes`로 축을 부분 지정하면 지정하지 않은 축은 수집한다.
- `SnapshotAxisSelection` — `entrySurfaces`, `dependencies`, `verification` 세 boolean. `ProjectSnapshot.collectedAxes`에 그대로 실린다.
- `computeSnapshotHash(projectRoot, filePaths, inputs?)` — 정렬된 relative path, content와 supplemental input의 SHA-256을 반환한다.
- `resolveHashFile(projectRoot, filePath): HashFile` — hash 대상 경로를 project root 기준 `{ absolutePath, relativePath }`로 정규화한다. 경로가 root 밖이면 던진다. 판정은 경로 문자열로만 하며 symlink는 따라가지 않는다. `computeSnapshotHash`와, 파일 내용이 아닌 경로 상태를 hash에 섞는 호출자(restructure의 probe)가 같은 containment를 쓰게 하려고 공개한다.
- graph evidence는 source file, raw specifier와 resolved target을 보존한다.

## Acceptance Criteria

### AC-snapshot-consistency — 동일 실행 증거

- tree, dependency graph와 verification이 같은 adapter/config 선택을 쓴다.
- source ownership 충돌과 분석 실패가 PASS로 사라지지 않는다.
- 분석은 snapshot 수집 중 확정한 detect/discovery를 다시 읽지 않는다.
- configured max depth를 넘는 node도 tree와 validation evidence에 남는다.
- 제외 디렉터리를 선언한 config는 그 디렉터리를 tree node에서도, dependency 증거에서도 빼고, 남은 미해결 참조가 없으면 graph certainty가 `exact`다.

### AC-snapshot-hash — Content-derived identity

- content 변경은 hash를 바꾸고 mtime-only 변경은 바꾸지 않는다.
- 정렬되지 않은 filesystem 반환 순서는 hash에 영향을 주지 않는다.
- byte/structure가 같은 프로젝트는 absolute root가 달라도 같은 hash다.
- 반환 snapshot의 machine path는 유지하되 hash supplemental evidence의 project-contained path는 portable relative path로 정규화한다.
- legacy ledger content 변경은 다른 snapshot 증거가 같아도 hash를 바꾼다.

### AC-legacy-criteria-evidence — Legacy ledger migration evidence

- ledger가 없으면 `legacyCriteriaLedger`가 `null`이고 별도 hash file input이 없다.
- ledger가 있으면 evidence의 `path`는 해당 legacy ledger의 absolute 위치를, `targetDetailPath`는 root `DETAIL.md`를 가리킨다.
- collector는 ledger를 삭제하거나 DETAIL로 자동 변환하지 않는다.

### AC-snapshot-boundary-exemptions — 선언된 면책 evidence

- `## Boundary Exemptions`가 없는 DETAIL.md는 `boundaryExemptions`를 만들지 않는다.
- 선언이 있으면 organ path를 소유 프랙탈 기준 절대 경로로 정규화해 보존하고 그 변경이 snapshot hash를 바꾼다.

### AC-evidence-derivable — 문서 이격·열거 증거

- 존재 주장 형태의 상대 경로 토큰은 node 디렉터리에서 project root까지 조상 디렉터리 체인으로 해석한 뒤 전부 실패하면 `stale-path` warning finding이 되고, finding 메시지에 섹션명이 들어간다. 존재를 주장하지 않는 토큰(`application/json` 같은 무점 basename·무말미슬래시)과 저장소에서 해석 불가한 위치(`~` 접두 home 표기, `$` 포함 변수 표기)는 검사하지 않는다.
- `..` 포함 토큰은 저자 상대 표기이므로 node 디렉터리 기준으로만 해석한다 — 조상 기준 재적용은 우연한 충족을 만든다.
- 말미 `/` 토큰은 같은 이름의 파일로 충족되지 않는다 — 디렉터리 주장은 디렉터리만 충족한다.
- `## Boundary Exemptions`/`## Organ Exemptions`/`## History`/`## Last Updated`/`## Dependencies` 섹션은 건너뛴다. History·Last Updated는 제거된 경로의 서술 장소이고, Dependencies는 파일 존재 주장이 아닌 결합 주소(컴파일 지정자 포함)를 담는다.
- 섹션 판정은 제목 문자열 단위다 — 같은 제목의 중복 섹션은 하나의 섹션으로 취급된다.
- INTENT 한 섹션이 직계 children(childFractalPaths+organPaths 기준 4개 이상) 절반 이상 basename을 나열하면 `derivable-structure` warning finding이 된다.
- 같은 섹션에서 `derivable-structure`가 발화하면 그 섹션의 `derivable-content`는 내지 않는다 — 다른 섹션의 `derivable-content`는 유지된다.
- 두 finding은 `checkDocumentContract` 경유로 rule engine violation이 되며 rule roster는 15개 그대로다.

### AC-snapshot-axes — 선택된 증거 축

- 축을 지정하지 않은 호출은 세 축을 모두 수집하고 `collectedAxes`가 전부 true다.
- `dependencies: false`면 `dependencyGraph`가 빈 그래프에 `unsupported` certainty이고 `collectedAxes.dependencies`가 false다. `verification: false`도 같은 방식이다.
- `entrySurfaces: false`면 node에 `entryPointSurfaces`가 없다.
- 축이 다른 두 snapshot은 다른 hash를 갖는다. 기본 축 호출의 hash는 축 선택을 도입하기 전과 같은 값이다.

### AC-snapshot-certainty — 불확실성 보존

- 레코드가 없거나 더는 결속하지 않는 범위 안 파일은 그 파일이 `unknownFiles`에 자기 상태를 cause로 달고 들어가며, 그 파일의 간선은 사라진다 — adapter가 같은 import를 읽을 수 있어도 메우지 않는다.
- `exact` 파일의 unresolved 참조는 `unresolved-local-dependency` 진단과 함께 그 파일을 `unknownFiles`에 넣는다. 파일의 상태는 여전히 `exact`이지만(스펙 §3에서 unresolved는 edge 속성이다) 그래프는 그 간선을 모르므로, 부재를 요구하는 결론이 그 위에서 성립하지 않고 리뷰 범위 거름망도 그 파일을 범위 안팎으로 가를 수 있다.
- 선언된 범위가 뺀 소스 파일은 `filesOutsideFactsScope` 개수로만 보고하고 `unknownFiles`에도 진단에도 들어가지 않으며 snapshot hash를 바꾸지 않는다. 파일 상태 분류는 그대로 `unsupported`다 — 바뀌는 것은 세는 식뿐이다. `fractal_inspect scan`과 restructure precondition·postcondition의 summary가 그 수를 싣는다.
- 실제 위치가 root 밖인 symlink 소비자는 조용히 빠지지 않고 `symlink-not-followed` 진단과 `unknownFiles` 항목을 남긴다.
- 외부 package dependency는 project graph의 unresolved로 오인하지 않는다.
- 선택 가능한 structure adapter가 없어도 참조는 저장소에서 오므로 dependency certainty는 `exact`이고, 불확실성은 파일별 `unknownFiles`에 남는다. verification adapter가 없으면 discovery가 비어 해당 certainty가 `unsupported`다.
- 선언된 facts 범위가 비어 있으면 빈 exact PASS가 아니라 dependency certainty가 `unsupported`이고 `facts-uninitialized` 진단 하나를 남긴다.
- source 또는 resolved target 어느 한쪽에 non-organ owner가 없는 참조는 `unowned-local-dependency` 진단을 남기되 graph certainty를 내리지 않는다. 소유 fractal이 없으면 노드가 없고, 노드 없는 간선으로 순환을 말할 수 없다 — 경계를 만드는 것은 사용자 동의 사항이므로(S6 A31/A32) 그 파일 때문에 분석이 멈추지 않는다. 빠짐없이 보고되는지는 `findUnownedReferences`의 property가 지킨다.
- 레코드가 없는 entry point의 surface는 빈 exact가 아니라 `indeterminate`이고 `entry-point-facts-unavailable` 진단이 함께 나온다.
- 레코드가 없는 verification 파일은 조용히 빠지지 않는다: verification certainty가 `indeterminate`이고 `verification-facts-unavailable` 진단이 그 경로를 싣는다.

## Last Updated

2026-09-20 — reference, entry-surface and verification evidence is read from the facts store; the adapter no longer fills a file the store does not hold.
