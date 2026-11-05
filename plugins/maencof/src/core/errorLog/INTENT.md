# errorLog

## Purpose

Hook 운영 에러를 볼트의 운영 에러 로그 파일에 영속화. checkup 에이전트가 반복 패턴 진단에 활용.

## Conventions

진단 로그가 원래 오류를 가리지 않게 한다. 안전 append는 catch 안에서도 호출되므로 기록 실패를 호출자로 전파하지 않는다.

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
