# contextResolve — minimal document chain

## Purpose

하나의 project snapshot에서 target owner와 owner-to-root INTENT/DETAIL 경로
chain만 반환해 최소 FCA context 탐색을 제공한다.

## Structure

- `contextResolve.ts` — snapshot 생성, core context resolution과 envelope payload
- `index.ts` — named handler export

## Conventions

- target과 반환 document path는 normalized absolute machine path다.
- 문서 본문은 읽거나 inline하지 않는다.

## Boundaries

### Always do

- config와 adapter registry로 snapshot을 한 번 생성
- project 밖 target과 incomplete owner chain을 명시적으로 거부
- snapshot diagnostics를 envelope에 보존

### Ask first

- chain 방향, nearest DETAIL 또는 output language 계약 변경

### Never do

- target document 본문, source text 또는 전체 tree 반환
- config나 project source 수정
- 언어/entry filename 추측

## Dependencies

- core projectSnapshot/contextResolver, adapters와 common envelope
