## Purpose

owner-token lock directory로 파일 단위 변경을 직렬화하고 timeout을 명시적으로
보고한다.

## Structure

- `index.ts`: 잠금 함수 공개 배럴.
- `operations/`: lock 획득·실행을 소유하는 organ.
- `helpers/`: owner token, stale 판정, quarantine, 대기 organ.

## Conventions

- 판단 우선순위: 1. 소유권 안전성 2. timeout 결정성 3. cleanup.
- 잠금 실패는 operation 실행 없이 `acquired: false`로 반환한다.

## Boundaries

### Always do

- live lock은 owner token이 일치할 때만 해제한다.
- stale lock은 고유 quarantine으로 rename한 프로세스만 정리한다.

### Ask first

- lock 디렉터리 형식, stale·timeout 기본값 변경.

### Never do

- timeout 후 잠금 없이 operation을 실행한다.
- 검증되지 않은 경로를 재귀 삭제한다.

## Dependencies

- Node `fs`, `crypto`; sibling `paths` entry point.
