# fractal_inspect resolve action — Filid 1.0 Contract

## Requirements

- 하나 이상의 request를 project path에서 만든 하나의 shared snapshot에 대해 해석한다.
- A target matched by config `ignore` fails with `context-target-ignored`, naming the matching pattern; other requests in the batch still resolve.
- 각 request의 target을 소유하는 가장 가까운 fractal부터 root까지 document reference를 반환한다.
- 가장 가까운 DETAIL 경로와 output language를 보존한다.
- 문서 content와 전체 tree를 반환하거나 다시 읽지 않는다.
- request 순서와 cardinality를 결과에서 보존하고, 한 request의 해석 실패가 나머지 결과를 제거하지 않는다.
- owner chain 경로와 범위 밖 diagnostic 수는 각 성공 item의 summary가 담는다.
- diagnostics는 각 owner chain 범위로 한정하며 top-level에는 first-seen 순서로 중복 제거해 모은다.
- `comparePaths`가 주어지면 해당 request 경로들의 lowest common fractal을 shared snapshot에서 해석한다.
- top-level summary는 batch 크기에 비례하는 경로나 diagnostics를 담지 않는다.
- 대규모 변경에서 snapshot 재생성과 도구 호출 수를 줄이기 위해 단일 target도 배열로 받는 batch 계약을 유지한다.

## API Contracts

- 개별 request 타입은 `ContextResolveInput`의 구성 요소로 유지하며 별도의 barrel export로 노출하지 않는다.

- 단일 target도 배열로 받고 입력 순서와 cardinality를 보존한다. 한 target의 실패가 다른 target의 결과를 지우지 않는다.
- top-level summary는 bounded count만 담고 chain은 item 결과에 남긴다. batch가 커져도 top-level summary가 batch 크기에 비례해 커지지 않게 한다.

## Acceptance Criteria

### AC-context-minimal — Bounded chain

- sibling/subtree와 무관한 문서나 문서 본문을 포함하지 않는다.
- owner가 없는 target 또는 project 밖 target은 해당 item의 실패로 반환하며, 그 `context-target-unresolved` diagnostic은 `nextAction`으로 project 안의 경로를 다시 넣고 재호출하라고 안내한다.
- An ignored target is unresolved with `context-target-ignored` and does not acquire an owner from the snapshot.
- Exclusion is deterministic, but the existing item statuses have no deterministic non-resolution value: `ok` means a resolved chain and `violations` means a violated rule. The unresolved item and batch therefore remain `indeterminate` while the diagnostic names the config decision.

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

## Last Updated

batch 계약, chain과 진단의 범위 한정이나 ignore 대상 처리 정책이 바뀔 때 갱신한다.
