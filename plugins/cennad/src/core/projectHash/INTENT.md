## Purpose

주어진 cwd 의 결정적 해시 (`sha256(cwd).slice(0, 12)`) 를 계산한다. cennad 세션은 cwd 마다 격리된 폴더에 저장되며, 그 폴더 이름이 이 project hash 다.

## Structure

| File             | Role                                                      |
| ---------------- | --------------------------------------------------------- |
| `projectHash.ts` | `sha256(cwd).digest('hex').slice(0, 12)` 반환 — 순수 함수 |
| `index.ts`       | barrel — `getProjectHash` re-export                       |

## Conventions

- 호출자가 `cwd` 를 명시적으로 전달 (`process.cwd()` 기본값 없음)
- 해시 길이 12자 고정 (hex 소문자)
- 캐시 없음 — 동일 입력에 대해 항상 동일 출력 (순수 함수)

## Boundaries

### Always do

- 결정적 출력 보장 (동일 입력 → 동일 출력)

### Ask first

- 해시 길이 또는 알고리즘 변경

### Never do

- `cwd` 를 직접 mutation
- 캐시 도입 (race condition 위험)
- `process.cwd()` 를 모듈 수준에서 직접 호출

## Dependencies

- `node:crypto` (`createHash`)
