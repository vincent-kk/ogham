# spreadingActivation

## Purpose

확산 활성화 알고리즘. 시드 노드에서 그래프 전파하여 관련 노드 점수 산출.

현행 엔진은 QGA-SA(`accumulativeActivation.ts`) 단독 — 합산-누적·차수 정규화·lexical 게이트. 설계: `.metadata/maencof/TOOL/Query-Gated-Accumulative-Spreading-Activation/`

비교용 v1(BFS max-전파)은 실행 코드와 분리하여 `.metadata/maencof/TOOL/Spreading-Activation-Engine-Archive/v1-bfs-max-propagation/` 에 격리 보존한다 — 격리본 단독으로 벤치마크 실행 가능(`node runtime/run.mjs`), 동결 지표와의 세대 간 비교는 아카이브 INDEX 참조.

## Conventions

허브의 확산 억제는 출차수 정규화에 맡기고 감쇠 인자는 최대로 준다. 레이어 감쇠 규칙을 복제하면 이 역할 구분이 어긋난다.

## Boundaries

### Always do

- graphBuilder의 adjacency list 사용
- weightCalculator의 레이어 감쇠 적용
- 엔진 변경 시 골든셋 ratchet 게이트(`__tests__/eval`) 통과 확인

### Ask first

- 전파 알고리즘 파라미터 변경
- 엔진 세대 교체(현행 엔진의 아카이브 이탈)

### Never do

- 그래프 구조 수정
- 아카이브 격리본과 코드 공유 (격리 원칙)
