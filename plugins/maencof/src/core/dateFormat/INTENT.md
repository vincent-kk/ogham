# dateFormat

## Purpose

날짜/시간 포맷 순수 헬퍼. YYYY-MM-DD / HH:MM 문자열 생성.

## Structure

- `index.ts` — barrel (공개 API: formatDate/formatTime)
- `operations/` organ — 포맷 순수 함수 (formatDate/formatTime, 함수 1개/파일)

## Boundaries

### Always do

- 순수 함수 유지 (side effect 없음)
- 로컬 시간대 기준 포맷

### Ask first

- 포맷 형식 변경

### Never do

- I/O 또는 상태 의존
