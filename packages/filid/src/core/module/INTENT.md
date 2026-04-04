# module -- 모듈 분석

## Purpose

index.ts 배럴 패턴 분석 및 모듈 공개 API 추출을 수행한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `index-analyzer` | index.ts 배럴 패턴 분석, export 추출 |
| `module-main-analyzer` | 모듈 엔트리포인트 탐색, 공개 API 분석 |

## Boundaries

### Always do
- 분석 결과는 `ModuleInfo`, `BarrelPattern` 타입으로 반환

### Ask first
- 엔트리포인트 탐색 우선순위 변경

### Never do
- 파일 내용 직접 수정

## Dependencies
- `../../types/`
