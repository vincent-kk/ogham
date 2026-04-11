# lossy-summarizer -- 도구 호출 히스토리 손실 요약

## Purpose

장시간 세션에서 축적된 도구 호출 이벤트 배열(`ToolCallEntry[]`)을 단일 `ToolCallSummary`로 집계해 토큰 사용을 절감한다. 개별 entry는 버려지며(비가역), 복원 불가능한 대신 최대 압축률을 얻는다.

## Structure

- `lossy-summarizer.ts` — `summarizeLossy` (public), `ToolCallEntry` / `ToolCallSummary` / `LossySummaryResult` 인터페이스

## Conventions

- 집계 지표: `totalEntries`, `toolCounts` (tool 이름별 카운트), `uniqueFiles` (Set 기반 중복 제거), `timeRange` (earliest/latest)
- 시간 범위는 timestamp 문자열을 단순 정렬(`sort()`)해 양 끝을 선택 — ISO 8601 가정
- `recoverable`은 항상 `false` — 메타데이터에도 동일하게 기록해 복원 시도 차단
- 빈 배열 입력 시 zero-filled 결과 + `earliest`/`latest=''` 반환 (예외 금지)
- `CompressionMeta.method === 'lossy'` 고정

## Boundaries

### Always do

- 새 집계 필드 추가 시 `ToolCallSummary` 인터페이스와 동시 확장
- `compressedLines: 1` (요약 단건) 약속 유지

### Ask first

- `timeRange` 계산을 `Date.parse` 기반으로 교체 (현재는 문자열 정렬)
- 부분 복원을 허용하는 하이브리드 요약 도입

### Never do

- 원본 entry를 결과 객체에 포함 (비가역성 위반)
- 파일 I/O 수행 (순수 함수 유지)

## Dependencies

- `../../types/documents.js` (`CompressionMeta`)
