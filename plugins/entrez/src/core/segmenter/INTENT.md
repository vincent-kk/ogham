## Purpose

🔴 10,000 UID 상한 우회. `Count>10000`이면 날짜(dp/edat/crdt) 버킷으로 재귀 분할해 **전수 확보**한다. recall의 핵심 안전장치.

## Conventions

- 네트워크는 주입(`CountFn`) — segmenter는 순수·테스트 가능. NCBI 호출 없음.
- 버킷은 **비중첩 완전 분할**(누락·중복 없음). 빈 버킷은 건너뛰고, 최대 깊이 초과 버킷만 `capped:true`.

## Boundaries

### Always do

- 모든 버킷이 cap 이하가 될 때까지 재귀(또는 `MAX_SEGMENT_DEPTH` 도달).
- 분할은 [from,to]를 빈틈없이 덮는다(전수).

### Ask first

- cap 값·최대 깊이·버킷 수 상수 변경(recall·요청수 영향).

### Never do

- adapters/mcp 직접 import. 버킷 중첩(중복 카운트) 허용. 인라인 문자열.
