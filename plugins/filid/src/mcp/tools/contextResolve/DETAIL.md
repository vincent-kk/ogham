# context_resolve — Filid 1.0 Contract

## Requirements

- project path와 target path를 같은 snapshot에 대해 해석한다.
- target을 소유하는 가장 가까운 fractal부터 root까지 document reference를 반환한다.
- 가장 가까운 DETAIL 경로와 output language를 보존한다.
- 문서 content와 전체 tree를 반환하거나 다시 읽지 않는다.

## API Contracts

- Input: `{ path, targetPath }`.
- Summary: project root, target, owner, chain length와 nearest DETAIL path.
- Data: core `ContextResolution`.
- diagnostics는 snapshot의 unsupported/ambiguous evidence를 보존한다.

## Acceptance Criteria

### AC-context-minimal — Bounded chain

- sibling/subtree와 무관한 문서나 문서 본문을 포함하지 않는다.
- owner가 없는 target 또는 project 밖 target은 성공으로 반환하지 않는다.

## Last Updated

2026-07-27 — snapshot 기반 최소 owner-to-root document chain 계약.
