# kgContext

## Purpose

지식 그래프 컨텍스트 조회 도구. 쿼리 기반 스니펫 조합.

## Structure

- `kgContext.ts` — handleKgContext 핸들러 (조립 + 스니펫)
- `helpers/` organ — selectContextCandidates (자연어 분해 + SA 후보 선정 + 단어 시드 계수 보고; 평가 하네스와 공유하는 단일 경로)

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임
- `include_content: false` 면 조립 markdown 없이 선택 문서 목록(`documents`)만 반환하고, content 모드의 `estimatedTokens` 는 include_full 스니펫까지 합산해 `token_budget` 을 넘기지 않는다

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
