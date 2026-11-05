## Purpose

10,000 UID 상한 우회. Count 가 10,000 을 넘으면 날짜(dp/edat/crdt) 버킷으로 재귀 분할해 전수를 확보한다 — recall 의 핵심 안전장치다. 더 나눌 수 없는 상한 초과는 capped 로 드러내어 recall 을 과장하지 않는다.

## Conventions

- 네트워크는 주입(`CountFn`) — segmenter는 순수·테스트 가능. NCBI 호출 없음.
- 날짜 분할은 비중첩이며 원 범위를 덮는다. 분할 후 재조회한 빈 버킷만 제외하며, 상한 이하 입력은 불필요한 조회를 피하려고 원 범위를 그대로 유지한다.

## Boundaries

### Always do

- cap 이하가 될 때까지 분할하되 최대 깊이 또는 날짜 분할 한계에서 멈추고, 남은 상한 초과를 capped로 표시한다.
- 분할은 [from,to]를 빈틈없이 덮는다(전수).

### Ask first

- cap 값·최대 깊이·버킷 수 상수 변경(recall·요청수 영향).

### Never do

- adapters/mcp 직접 import. 버킷 중첩(중복 카운트) 허용. 인라인 문자열.
