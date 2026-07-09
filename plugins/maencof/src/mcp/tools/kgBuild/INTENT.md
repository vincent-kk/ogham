# kgBuild

## Purpose

지식 그래프 빌드 도구. 전체/증분 빌드 지원.

## Structure

- `index.ts` — 순수 barrel (handleKgBuild + @internal buildStemIndex/resolveAndAttachLinks + 타입)
- `types/` organ — KgBuildInput / KgBuildResult / KgBuildParseFailure / BuildOutput
- `operations/` organ — handleKgBuild(오케스트레이터) / fullBuild / incrementalBuild / resolveAndAttachLinks / buildStemIndex / toCurrentFileInfos

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
