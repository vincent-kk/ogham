# tagSimilarity

## Purpose

태그 기반 노드 유사도 계산. Jaccard 유사도 및 태그 빈도 분석.

## Structure

- `index.ts` — 순수 barrel (공개 API: normalizeTags/jaccardSimilarity/extractKeywords/commonTags)
- `operations/` organ — 유사도 계산 (normalizeTags/jaccardSimilarity/extractKeywords/commonTags, 함수 1개/파일)

## Boundaries

### Always do

- KnowledgeNode 태그 배열 활용
- 정규화된 유사도 점수 반환

### Ask first

- 유사도 계산 알고리즘 변경

### Never do

- 태그 데이터 직접 수정
