# context_resolve — Filid 1.0 Contract

## Requirements

- project path와 target path를 같은 snapshot에 대해 해석한다.
- target을 소유하는 가장 가까운 fractal부터 root까지 document reference를 반환한다.
- 가장 가까운 DETAIL 경로와 output language를 보존한다.
- 문서 content와 전체 tree를 반환하거나 다시 읽지 않는다.
- owner chain 경로는 summary가 담는다. inline 예산을 넘겨 data가 artifact로 나가도 chain 자체는 인라인에 남는다.
- diagnostics는 owner chain 범위로 한정하고 제외한 건수를 summary에 보고한다.
- `comparePaths`가 주어지면 그 경로들의 lowest common fractal을 같은 snapshot에서 해석한다.

## API Contracts

- Input: `{ path, targetPath, comparePaths? }`.
- Summary: project root, target, owner, chain length, owner-to-root chain 경로, nearest DETAIL path, output language, 범위 밖 diagnostic 수, 그리고 `comparePaths`를 준 경우 lowest common fractal path.
- Data: core `ContextResolution`.
- diagnostics는 chain 범위 안의 unsupported/ambiguous evidence와 path 없는 전역 evidence를 보존한다.
- `comparePaths`를 생략하면 응답 의미는 이전과 같고 `lowestCommonFractalPath`는 나타나지 않는다.

## Acceptance Criteria

### AC-context-minimal — Bounded chain

- sibling/subtree와 무관한 문서나 문서 본문을 포함하지 않는다.
- owner가 없는 target 또는 project 밖 target은 성공으로 반환하지 않는다.

### AC-context-inline-chain — chain은 인라인에 남는다

- summary가 owner에서 root 순서로 fractal 경로를 담는다.
- data가 artifact로 나가는 응답에서도 chain 경로를 인라인에서 읽을 수 있다.

### AC-context-scoped-diagnostics — 범위 한정 진단

- chain 밖 경로를 가진 snapshot diagnostic은 응답에서 제외한다.
- path 없는 diagnostic은 유지한다.
- 제외 건수를 summary가 보고하며 0이어도 필드는 존재한다.
- status는 chain 범위 안 diagnostic만 반영한다. 무관한 서브트리의 증거가 이 질의를 indeterminate로 만들지 않는다.

### AC-context-common-fractal — 경로 비교

- `comparePaths`의 모든 경로를 소유하는 가장 낮은 공통 fractal 경로를 반환한다.
- 공통 fractal을 확정할 수 없으면 `null`이며 이를 실패로 바꾸지 않는다.

## Last Updated

2026-07-29 — chain 경로 인라인화, chain 범위 진단과 lowest common fractal 질의를 계약에 추가했다.
