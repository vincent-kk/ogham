# communityDetector

## Purpose

지식 그래프의 커뮤니티(클러스터) 탐지. 연결 밀도 기반 노드 그룹핑.

## Conventions

탐지 알고리즘 교체는 별도 결정을 거친다. 입력 그래프를 수정하지 않는 경계를 유지하여 탐지가 검색용 그래프를 바꾸지 않게 한다.

## Boundaries

### Always do

- adjacency list 기반 연산
- NodeId 타입 사용

### Ask first

- 탐지 알고리즘 변경

### Never do

- 그래프 구조 직접 수정
