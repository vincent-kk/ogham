# projectSnapshot contract

## Requirements

- 등록된 structure/verification adapter와 config v2로 하나의 `ProjectSnapshot`을 만든다.
- 호출자는 수집할 증거 축(entry surface, dependency, verification)을 고를 수 있고 기본값은 전부 수집이다. tree와 문서 증거는 축이 아니라 언제나 수집한다 — 나머지 축이 그 위에서만 의미를 갖기 때문이다.
- 수집하지 않은 축은 빈 값에 `unsupported` certainty로 남고, 무엇을 수집했는지는 `collectedAxes`가 말한다. 빈 결과와 미수집을 구분하는 근거는 이 필드 하나이며, 이를 읽지 않고 축을 신뢰하는 소비자는 계약을 어긴 것이다.
- 축 선택은 snapshot hash 입력에 포함한다. 축이 다른 두 snapshot이 같은 hash를 갖지 않는다.
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
- root `.filid/criteria.md`가 없으면 `legacyCriteriaLedger`는 `null`이다.
- root `.filid/criteria.md`가 있으면 absolute ledger path와 migration target인 root `DETAIL.md` absolute path를 보존하고 ledger content를 snapshot hash에 포함한다.

## API Contracts

- `createProjectSnapshot(projectRoot, registry, config, options?): Promise<ProjectSnapshot>` — read-only snapshot을 생성한다. `options.axes`로 축을 부분 지정하면 지정하지 않은 축은 수집한다.
- `SnapshotAxisSelection` — `entrySurfaces`, `dependencies`, `verification` 세 boolean. `ProjectSnapshot.collectedAxes`에 그대로 실린다.
- `computeSnapshotHash(projectRoot, filePaths, inputs?)` — 정렬된 relative path, content와 supplemental input의 SHA-256을 반환한다.
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
- ledger가 있으면 evidence의 `path`와 `targetDetailPath`가 각각 absolute root `.filid/criteria.md`와 root `DETAIL.md`를 가리킨다.
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

- unresolved local dependency가 있으면 graph certainty가 indeterminate다.
- 외부 package dependency는 project graph의 unresolved로 오인하지 않는다.
- 선택 가능한 structure/verification adapter가 없으면 빈 exact PASS가 아니라 해당 분석 certainty가 `unsupported`다.

## Last Updated

2026-08-16 — stale-path를 존재 주장 형태·조상 체인 해석으로 좁히고, History를 면제하고, derivable-structure를 섹션 단위 구체 규칙 우선으로 바꿨다.
