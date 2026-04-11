# pr-summary — PR 검증 결과 요약 생성기

## Purpose

PR 검증 파일들(structure-check.md, fix-requests.md, review-report.md, re-validate.md)을
파싱하여 인간 친화적 HumanSummary를 생성한다.

## Structure

| 오르간 | 책임 |
|--------|------|
| `parsers/` | 원시 마크다운/YAML 파싱 (parse-structure-check, parse-fix-requests) |
| `aggregators/` | 파싱 결과 → SummaryItem 변환 및 verdict 결정 |
| `renderers/` | SummaryItem → 마크다운 렌더링 |
| `pr-summary.ts` | 오케스트레이터 facade (generateHumanSummary 진입점) |

## Conventions

- 모든 함수는 순수 함수: I/O 없음, 동일 입력 → 동일 출력 (generatedAt 제외)
- 파싱 실패는 null/빈 배열로 graceful degradation
- `export *`는 type-only 심볼을 전달하지 않으므로 `export type *`를 별도 추가

## Boundaries

### Always do

- 공개 API 변경 시 `src/core/index.ts` re-export 경로도 함께 갱신
- 파싱 오류는 null/빈 배열로 graceful degradation 처리
- 오르간 디렉토리(parsers/, aggregators/, renderers/)에 INTENT.md 추가 금지

### Ask first

- `GenerateSummaryInput` 인터페이스 필드 추가/제거
- 마크다운 렌더링 포맷 변경 (기존 consumer가 파싱에 의존할 수 있음)

### Never do

- I/O 직접 수행 (파일 읽기/쓰기는 호출측 담당)
- `mcp/`, `hooks/`, `ast/` 모듈 직접 import

## Dependencies

`../../types/summary`, `../../constants/review-probabilities`
