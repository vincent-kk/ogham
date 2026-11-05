## Purpose

CLI 표면 — 인자를 명령 객체로 파싱하고, 진단·파일 액션을 사람이 읽는 텍스트로 포맷한다. 전부 순수 함수이며, 스트림 쓰기와 exit 코드는 `main.ts` 가 담당한다.

## Conventions

- 포맷 함수는 문자열을 **반환**한다 — 직접 쓰지 않는다(테스트 가능성).
- 플러그인 경로 인자는 파싱 시점에 절대경로로 정규화한다.

## Boundaries

### Always do

- 출력 형식 변경 시 스펙(`__tests__/formatOutcomes.test.ts`)을 함께 갱신 — CI 로그가 이 형식을 읽는다.

### Ask first

- 새 서브커맨드·플래그 추가 (상위 패키지의 CLI 계약과 동시 갱신).

### Never do

- 스트림 쓰기·`process.exit` 호출 — 부수효과는 `main.ts` 단일 지점.
- 디스크 접근.
