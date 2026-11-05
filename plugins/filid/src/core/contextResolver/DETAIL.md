# contextResolver contract

## Requirements

- 문서 evidence가 없는 fallback에서도 INTENT.md 부재만 missing을 뜻한다. DETAIL.md는 기록할 계약이 있을 때만 필요하므로 부재를 오류로 표시하지 않는다.

- target path를 포함하는 가장 깊은 node에서 소유 fractal을 결정한다.
- organ target은 `parentFractalPath`를 사용하고 nested fractal은 자신의 경계를 유지한다.
- owner부터 root까지 document ref만 반환하며 본문은 반환하지 않는다.
- snapshot의 output language와 document status를 그대로 사용한다.

## API Contracts

- project 밖 target이나 owner chain 미결정은 명시적 오류다. root fallback은 잘못된 경계 지침을 전달하므로 허용하지 않는다.
- 문서 본문 대신 경로와 상태만 전달하여 같은 문서 내용이 컨텍스트에 중복되지 않게 한다.

## Acceptance Criteria

### AC-context-owner — 정확한 소유 경계

- organ 파일은 가장 가까운 소유 fractal로, organ 아래 nested fractal 파일은 nested fractal로 해석된다.
- project root 밖 target은 root fallback 없이 거부된다.

### AC-context-chain — 작은 snapshot-derived 응답

- chain 순서는 owner → root이고 nearest DETAIL은 첫 DETAIL ref다.
- 결과에는 문서 경로, line count와 status만 있고 본문은 없다.

## Last Updated

owner chain의 범위, 문서 참조 상태나 DETAIL 부재 처리가 바뀔 때 갱신한다.
