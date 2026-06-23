## Purpose

작업 디렉토리(cwd)를 세션 스코프 키로 변환하는 모듈. 같은 머신의 서로 다른 프로젝트 세션을 격리한다.

## Structure

| File                           | Role                                                    |
| ------------------------------ | ------------------------------------------------------- |
| `operations/getProjectHash.ts` | `sha256(cwd)` digest 의 앞 12 hex 문자 스코프 해시 반환 |
| `index.ts`                     | barrel — `getProjectHash` re-export                     |

## Conventions

- 해시 입력은 호출자가 전달한 cwd 문자열 그대로 (정규화 없음)
- 출력은 항상 12자 hex (`sha256` digest 의 `slice(0, 12)`)
- 순수 함수 — I/O·상태 없음

## Boundaries

### Always do

- `sha256` 으로 해시하고 앞 12 hex 만 사용

### Ask first

- 해시 알고리즘·자릿수 변경 (기존 세션 스코프 무효화)

### Never do

- cwd 를 디스크·로그에 평문 기록 (해시만 저장)

## Dependencies

- `node:crypto` (`createHash`)
