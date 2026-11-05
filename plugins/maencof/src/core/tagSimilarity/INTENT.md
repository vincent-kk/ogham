# tagSimilarity

## Purpose

태그 기반 노드 유사도 계산. Jaccard 유사도 및 태그 빈도 분석.

## Conventions

유사도는 입력 태그를 읽어 계산한다. 알고리즘 교체는 별도 결정을 거쳐 점수 의미가 조용히 바뀌지 않게 한다.

## Boundaries

### Always do

- KnowledgeNode 태그 배열 활용
- 정규화된 유사도 점수 반환

### Ask first

- 유사도 계산 알고리즘 변경

### Never do

- 태그 데이터 직접 수정
