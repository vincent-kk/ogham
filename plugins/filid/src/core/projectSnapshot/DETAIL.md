# projectSnapshot contract

## Requirements

- 등록된 structure/verification adapter와 config v2로 하나의 `ProjectSnapshot`을 만든다.
- snapshot은 tree, owner-level dependency graph, verification, adapter IDs, diagnostics, output language, legacy criteria evidence와 content-derived hash를 함께 가진다.
- ambiguous/unsupported ownership, unresolved local dependency와 문서 위반은 숨기지 않는다.
- structure/verification detect와 discovery는 adapter마다 한 번 수행하고 portable absolute path claim으로 정규화해 분석에 전달한다.
- tree entry evidence는 확정된 structure ownership만 사용하고 adapter별 entry override를 해당 adapter에 전달한다.
- config `maxDepth`는 validation 한계이며 snapshot tree traversal을 자르지 않는다.
- DETAIL.md가 `## Boundary Exemptions`를 선언하면 그 항목을 `node.documentEvidence.boundaryExemptions`에 보존한다. `targetPath`는 소유 프랙탈 기준으로 정규화한 절대 경로이며, rule engine은 다시 파일을 읽지 않고 이 evidence만 읽는다.
- dependency graph는 non-organ owner path와 함께 organ path 목록도 받아, owner subtree 안의 owned-organ 참조를 cycle adjacency에서 제외한다.
- 동일 bytes와 구조는 프로젝트 absolute root 및 mtime과 무관하게 같은 hash이고 file content 또는 구조 입력 변경은 hash를 바꾼다.
- root `.filid/criteria.md`가 없으면 `legacyCriteriaLedger`는 `null`이다.
- root `.filid/criteria.md`가 있으면 absolute ledger path와 migration target인 root `DETAIL.md` absolute path를 보존하고 ledger content를 snapshot hash에 포함한다.

## API Contracts

- `createProjectSnapshot(projectRoot, registry, config): Promise<ProjectSnapshot>` — read-only snapshot을 생성한다.
- `computeSnapshotHash(projectRoot, filePaths, inputs?)` — 정렬된 relative path, content와 supplemental input의 SHA-256을 반환한다.
- graph evidence는 source file, raw specifier와 resolved target을 보존한다.

## Acceptance Criteria

### AC-snapshot-consistency — 동일 실행 증거

- tree, dependency graph와 verification이 같은 adapter/config 선택을 쓴다.
- source ownership 충돌과 분석 실패가 PASS로 사라지지 않는다.
- 분석은 snapshot 수집 중 확정한 detect/discovery를 다시 읽지 않는다.
- configured max depth를 넘는 node도 tree와 validation evidence에 남는다.

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

### AC-snapshot-certainty — 불확실성 보존

- unresolved local dependency가 있으면 graph certainty가 indeterminate다.
- 외부 package dependency는 project graph의 unresolved로 오인하지 않는다.
- 선택 가능한 structure/verification adapter가 없으면 빈 exact PASS가 아니라 해당 분석 certainty가 `unsupported`다.

## Last Updated

2026-07-28 — 경계 면책 evidence와 graph organ path 입력을 계약에 추가했다.
