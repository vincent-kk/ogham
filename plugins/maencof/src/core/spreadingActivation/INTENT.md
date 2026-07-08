# spreadingActivation

## Purpose

확산 활성화 알고리즘. 시드 노드에서 그래프 전파하여 관련 노드 점수 산출.

두 엔진이 공존한다:

- `spreadingActivation.ts` — v1 (BFS max-전파). **성능지표 비교 기준선용 하드카피 — 동결.**
- `accumulativeActivation.ts` — v2 QGA-SA (합산-누적·차수 정규화·lexical 게이트). 설계: `.metadata/maencof/TOOL/Query-Gated-Accumulative-Spreading-Activation/`

엔진 선택은 queryEngine의 `engine` 옵션이 담당한다. v2는 v1과 코드를 공유하지 않는 자체 완결 구현이다 — 격리가 재사용에 우선한다(기준선 오염 방지).

## Boundaries

### Always do

- graphBuilder의 adjacency list 사용
- weightCalculator의 레이어 감쇠 적용
- v2 변경 시 골든셋 ratchet 게이트(`__tests__/eval`) 통과 확인

### Ask first

- 전파 알고리즘 파라미터 변경
- 기본 엔진(SA_DEFAULT_ENGINE) 전환

### Never do

- 그래프 구조 수정
- **v1(`spreadingActivation.ts`) 수정 — 비교 기준선 하드카피** (버그 수정도 사용자 승인 필요)
- v1↔v2 간 헬퍼 공유 도입 (격리 원칙)
