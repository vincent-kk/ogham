## Purpose

신뢰도 게이트 fractal. 컴파일 산출물을 오라클과 비교해 무결손·무표류를 기계적으로 증명한다.

## Structure

| Path                                     | Role                                          |
| ---------------------------------------- | --------------------------------------------- |
| `index.ts`                               | barrel — `claudeEquivalence` · `diffMaps` 등  |
| `claudeEquivalence/claudeEquivalence.ts` | Claude 타깃 vs 현행 커밋 산출물 (오라클) 비교 |
| `diffTree/diffMaps.ts`                   | 두 FileMap 비교 (JSON 의미 / 그 외 바이트)    |
| `diffTree/readDirAsFileMap.ts`           | 디렉터리 → FileMap (오라클 로드)              |

## Conventions

- 오라클 = `constants/layout` 의 `CLAUDE_INSTALL_ENTRIES`(Claude 컴포넌트+런타임 세트)로 읽은 현행 커밋 산출물. npm `package.json:files` 아님(agents 누락 등 불일치). 별도 골든 파일 없음.
- JSON 은 의미 비교(포맷 무관), 그 외는 바이트 비교(스킬 라운드트립·assets).
- 빈 `Diff[]` = 통과. 비어있지 않으면 실패(경로별 missing/unexpected/changed).

## Boundaries

### Always do

- 등가 게이트는 `compilePlugin`(순수)만 호출 — 디스크 산출물이 아니라 emit 결과와 비교.

### Ask first

- 비교 정책 변경(예: JSON 도 바이트 강제).

### Never do

- 오라클을 손으로 만든 골든 파일로 대체 (현행 산출물이 오라클).

## Dependencies

- `pipeline/compilePlugin`, `json/jsonEqual`, `fsx/readTree`, `constants/layout`, `types/output`.
