# spreading-activation

## Purpose

확산 활성화 알고리즘. 시드 노드에서 그래프 전파하여 관련 노드 점수 산출.

## Boundaries

### Always do

- graph-builder의 adjacency list 사용
- weight-calculator의 레이어 감쇠 적용

### Ask first

- 전파 알고리즘 파라미터 변경

### Never do

- 그래프 구조 수정
