# providers/github

## Purpose

GitHub Issues 프로바이더 구현. `## Links` 섹션 파싱 및 이슈 바디 메타 블록 처리.

## Structure

| File | Role |
|---|---|
| `parse-links.ts` | `## Links` 섹션 → `GithubLinks` 레코드 파서 (순수 함수) |

## Conventions

- 모든 함수는 순수 함수 (string input → typed output, no I/O)
- 알 수 없는 linkType은 `console.warn` 후 skip (전방 호환)
- 파싱 실패 시 부분 결과 반환 (throw하지 않음)

## Boundaries

### Always do

- `GithubLinks` 타입 및 `parseLinks` 함수를 `index.ts` 배럴을 통해 노출
- 새 파서 추가 시 index.ts에 re-export 추가

### Ask first

- `## Links` 문법 확장 (SPEC-provider-github.md §link-handling 참조)
- `console.warn` 외 로깅 라이브러리 도입

### Never do

- gh CLI, fs, 네트워크 등 외부 I/O 직접 호출
- Zod 등 외부 검증 라이브러리 도입 (string 연산만 사용)
