# communityDetector

## Purpose

지식 그래프의 커뮤니티(클러스터) 탐지. 연결 밀도 기반 노드 그룹핑.

## Structure

- `index.ts` — 순수 barrel (공개 API: CommunityDetector/detectCommunities + 타입)
- `types/` organ — 공개 타입 (Community/CommunityDetectionResult/CommunityDetectorParams)
- `operations/` organ — 탐지 실행 (CommunityDetector 클래스 + detectCommunities 래퍼, 함수 1개/파일)

## Boundaries

### Always do

- adjacency list 기반 연산
- NodeId 타입 사용

### Ask first

- 탐지 알고리즘 변경

### Never do

- 그래프 구조 직접 수정
