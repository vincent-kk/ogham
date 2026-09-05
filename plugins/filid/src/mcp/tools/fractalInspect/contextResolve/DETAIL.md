# fractal_inspect resolve action — Filid 1.0 Contract

## Requirements

- 하나 이상의 request를 project path에서 만든 하나의 shared snapshot에 대해 해석한다.
- 각 request의 target을 소유하는 가장 가까운 fractal부터 root까지 document reference를 반환한다.
- 가장 가까운 DETAIL 경로와 output language를 보존한다.
- 문서 content와 전체 tree를 반환하거나 다시 읽지 않는다.
- request 순서와 cardinality를 결과에서 보존하고, 한 request의 해석 실패가 나머지 결과를 제거하지 않는다.
- owner chain 경로와 범위 밖 diagnostic 수는 각 성공 item의 summary가 담는다.
- diagnostics는 각 owner chain 범위로 한정하며 top-level에는 first-seen 순서로 중복 제거해 모은다.
- `comparePaths`가 주어지면 해당 request 경로들의 lowest common fractal을 shared snapshot에서 해석한다.
- top-level summary는 batch 크기에 비례하는 경로나 diagnostics를 담지 않는다.

## API Contracts

- Input: `{ path, requests: [{ targetPath, comparePaths? }, ...] }`; `requests`는 최소 1개다.
- Summary: project root와 request, resolved, failed, indeterminate 건수.
- Data: 입력 순서의 `results`; 각 result는 index, normalized target path, status, diagnostics와 success discriminator를 가진다.
- 성공 result는 item summary와 core `ContextResolution`을 가진다. 실패 result는 target diagnostic만 가지며 다른 request 결과를 보존한다.
- item summary는 target, owner, chain length와 owner-to-root chain 경로, nearest DETAIL path, output language, 범위 밖 diagnostic 수, optional lowest common fractal path를 가진다.
- 단일 target도 `requests`에 한 item으로 전달하고 `results[0]`에서 읽는다.

## Acceptance Criteria

### AC-context-minimal — Bounded chain

- sibling/subtree와 무관한 문서나 문서 본문을 포함하지 않는다.
- owner가 없는 target 또는 project 밖 target은 해당 item의 실패로 반환한다.

### AC-context-batch — Shared snapshot과 독립 결과

- 100개 request도 snapshot을 한 번만 생성한다.
- 결과 순서와 cardinality는 requests와 같다.
- 일부 target이 실패해도 해석 가능한 target의 결과는 유지한다.
- 하나 이상의 item이 성공하지 못하면 top-level status는 `indeterminate`다.

### AC-context-inline-chain — chain은 result에 남는다

- 각 성공 item summary가 owner에서 root 순서로 fractal 경로를 담는다.
- top-level summary는 batch 크기와 무관하게 bounded count만 담는다.

### AC-context-scoped-diagnostics — 범위 한정 진단

- chain 밖 경로를 가진 snapshot diagnostic은 응답에서 제외한다.
- path 없는 diagnostic은 유지한다.
- 제외 건수를 item summary가 보고하며 0이어도 필드는 존재한다.
- item status는 해당 chain 범위 diagnostic만 반영한다. 무관한 서브트리의 증거가 이 request를 indeterminate로 만들지 않는다.

### AC-context-common-fractal — 경로 비교

- `comparePaths`의 모든 경로를 소유하는 가장 낮은 공통 fractal 경로를 반환한다.
- 공통 fractal을 확정할 수 없으면 `null`이며 이를 실패로 바꾸지 않는다.

## History

- 2026-09-05 — batch payload와 strict scalar-field 거부를 유지한 채 `fractal_inspect`의 `resolve` action으로 이동했다.
- 2026-08-28 — 대규모 변경에서 snapshot 재생성과 tool 호출 수를 줄이기 위해 array-first batch 계약으로 전환했다.

## Last Updated

2026-09-05
