# contextResolve — batched minimal document chains

## Purpose

`fractal_inspect`의 `resolve` action에서 하나의 project snapshot으로 여러 target의 owner와 owner-to-root INTENT/DETAIL 경로 chain을 독립적으로 해석해 최소 FCA context 탐색을 제공한다.

## Conventions

- target과 반환 document path는 normalized absolute machine path다.
- 문서 본문은 읽거나 inline하지 않는다.

## Boundaries

### Always do

- batch 호출마다 config와 adapter registry로 snapshot을 정확히 한 번 생성
- 요청 순서와 cardinality를 보존하고 각 target의 성공 또는 실패를 독립적으로 반환
- project 밖 target과 incomplete owner chain을 item diagnostic으로 명시
- 각 chain 범위 snapshot diagnostics를 보존하고 제외 건수를 item summary로 보고
- top-level summary는 요청·성공·실패·불확실 건수로 제한

### Ask first

- request/result 순서, chain 방향, nearest DETAIL 또는 output language 계약 변경

### Never do

- target document 본문, source text 또는 전체 tree 반환
- config나 project source 수정
- 언어/entry filename 추측

## Dependencies

- core projectSnapshot/contextResolver, adapters와 common envelope
