# contextResolver contract

## Requirements

- target path를 포함하는 가장 깊은 node에서 소유 fractal을 결정한다.
- organ target은 `parentFractalPath`를 사용하고 nested fractal은 자신의
  경계를 유지한다.
- owner부터 root까지 document ref만 반환하며 본문은 반환하지 않는다.
- snapshot의 output language와 document status를 그대로 사용한다.

## API Contracts

- `resolveContext(snapshot, targetPath): ContextResolution` — owner, chain,
  nearest DETAIL과 output language를 반환한다.
- project 밖 target 또는 소유 node를 결정할 수 없는 target은 throw한다.

## Acceptance Criteria

### AC-context-owner — 정확한 소유 경계

- organ 파일은 가장 가까운 소유 fractal로, organ 아래 nested fractal 파일은
  nested fractal로 해석된다.
- project root 밖 target은 root fallback 없이 거부된다.

### AC-context-chain — 작은 snapshot-derived 응답

- chain 순서는 owner → root이고 nearest DETAIL은 첫 DETAIL ref다.
- 결과에는 문서 경로, line count와 status만 있고 본문은 없다.

## Last Updated

2026-07-27 — snapshot 기반 최소 context 계약을 정의했다.
