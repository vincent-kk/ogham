# contextAssembler

## Purpose

검색 결과 컨텍스트 조합. 활성화 결과에서 최적 스니펫 추출 및 조합.

## Structure

- `index.ts` — 순수 barrel (공개 API: extractBestSnippet/assembleContext/ContextAssembler + 타입)
- `types/` organ — 공개 타입 (ContextItem/AssembleOptions/AssembledContext)
- `operations/` organ — 스니펫 추출·컨텍스트 조립 (extractBestSnippet/assembleContext/ContextAssembler + 파이프라인 헬퍼 toContextItems·itemToMarkdown·selectItemsWithinBudget·buildMarkdown·estimateTokens·layerName·describeRelation, 함수 1개/파일)

## Boundaries

### Always do

- ActivationResult 기반 스니펫 선택
- 토큰 한도 내 컨텍스트 구성

### Ask first

- 스니펫 추출 전략 변경

### Never do

- 그래프 데이터 수정
