# providers/github

## Purpose

GitHub Issues 프로바이더 구현. `## Links` 섹션 파싱 및 이슈 바디 메타 블록 처리.

## Conventions

- 파싱 결과는 입력 문자열만으로 결정한다. 알 수 없는 링크 타입의 진단 경고는 허용하되 결과 계산에 외부 상태를 사용하지 않는다.
- 알 수 없는 linkType은 `console.warn` 후 skip (전방 호환)
- 파싱 실패 시 부분 결과 반환 (throw하지 않음)

## Boundaries

### Always do

- `GithubLinks` 타입 및 `parseLinks` 함수를 `index.ts` 배럴을 통해 노출
- 새 파서 추가 시 index.ts에 re-export 추가

### Ask first

- `## Links` 문법 확장 (provider의 링크 처리 계약과 함께 검토)
- `console.warn` 외 로깅 라이브러리 도입

### Never do

- gh CLI, 파일·네트워크·프로세스 I/O 직접 호출 — 트래커 실행과 문자열 파싱의 경계를 유지한다. 전방 호환 진단을 위한 console.warn은 허용한다.
- Zod 등 외부 검증 라이브러리 도입 (string 연산만 사용)
