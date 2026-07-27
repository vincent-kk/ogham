# contextResolver — 최소 문서 context 해석

## Purpose

ProjectSnapshot에서 target의 소유 fractal과 owner-to-root INTENT/DETAIL 경로 chain을 결정한다.

## Structure

- `contextResolver.ts` — owner chain과 context 응답 조립
- `pathing/` organ — portable containment와 deepest node 해석
- `documents/` organ — snapshot document evidence를 작은 ref로 투영
- entry point는 `index.ts`; 문서 본문은 반환하지 않는다.

## Conventions

- chain은 owner에서 root 방향으로 정렬한다.
- tradeoff 우선순위: 1. 정확한 owner 2. snapshot 일관성 3. 작은 응답

## Boundaries

### Always do

- snapshot의 document evidence와 output language만 소비
- project 밖 target과 owner 미결정을 명시적 오류로 반환
- 가장 가까운 DETAIL 경로를 chain에서 결정

### Ask first

- target existence 또는 planned-path 처리 정책 변경
- chain 방향이나 document status 의미 변경

### Never do

- root 문서를 owner fallback으로 임의 선택
- INTENT/DETAIL 본문을 결과에 포함
- live config 또는 filesystem을 다시 읽어 snapshot과 섞기

## Dependencies

- `../projectSnapshot/` public contract와 `../../types/context.js`
