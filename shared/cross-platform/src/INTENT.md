# cross-platform — 공개 OS 호환성 소스 경계

## Purpose

`src/`는 `@ogham/cross-platform`의 공개 소스 루트다. 하위 fractal의
OS·호스트 호환 기능을 순수 루트 배럴로 통합한다.

## Conventions

- 패키지 외부 소비자는 `@ogham/cross-platform` 루트만 import한다.
- 루트 배럴은 구체 소유 파일에서 공개 심볼을 이름으로 재노출한다.
- 하위 fractal은 상대의 entry point만 소비하며 의존성 그래프를 DAG로 유지한다.
- `hostRegistry`는 내부 의존이 없는 leaf다.

## Boundaries

### Always do

- 새 공개 심볼을 루트 `index.ts`에 이름으로 추가하고 package exports는 유지한다.
- 시스템 호출과 순수 정책을 분리한다.

### Ask first

- `src/` 루트 peer 파일 추가.
- 하위 fractal 간 새 의존 간선 추가.

### Never do

- 루트 `index.ts`에 선언 구현.
- 패키지 외부 소비자가 하위 파일을 deep import.

## Dependencies

- 내부: 하위 fractal과 공개 심볼의 구체 소유 파일.
- 외부: 각 하위 fractal이 자체 소유.
