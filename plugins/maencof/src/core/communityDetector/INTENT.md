# communityDetector

## Purpose

지식 그래프 커뮤니티(클러스터) 탐지의 자리. 탐지 알고리즘은 설계 정본의 Phase 2+ 범위라 아직 없고, 현재 결과는 그래프와 무관한 빈 목록과 stub 표식이다 — 소비자가 빈 결과를 "커뮤니티 없음"이라는 분석 결과로 읽지 않게 한다.

## Conventions

탐지 알고리즘 교체는 별도 결정을 거친다. 입력 그래프를 수정하지 않는 경계를 유지하여 탐지가 검색용 그래프를 바꾸지 않게 한다.

## Boundaries

### Always do

- 탐지를 구현할 때는 adjacency list 기반으로 연산 — 검색용 그래프와 같은 인접 구조를 쓴다
- NodeId 타입 사용

### Ask first

- 탐지 알고리즘 변경

### Never do

- 그래프 구조 직접 수정
