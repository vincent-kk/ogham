# error-log

## Purpose

Hook 운영 에러를 `.maencof-meta/error-log.json`에 영속화. checkup 에이전트가 반복 패턴 진단에 활용.

## Structure

- `error-log.ts` — appendErrorLog, appendErrorLogSafe, readErrorLog
- `index.ts` — barrel export

## Boundaries

### Always do

- appendErrorLogSafe는 fire-and-forget (내부 try-catch, 절대 throw하지 않음)
- 최대 200건, FIFO 방식 초과 항목 제거

### Ask first

- 최대 로그 건수 변경
- 로그 포맷 변경

### Never do

- appendErrorLogSafe에서 예외 전파
- mcp/ 또는 hooks/ 직접 의존
