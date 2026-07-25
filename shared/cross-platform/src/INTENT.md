# cross-platform

## Purpose

`src/`는 `@ogham/cross-platform`의 공개 소스 루트다. 하위 fractal의
OS·호스트 호환 기능을 순수 루트 배럴로 통합한다.

## Structure

| Path            | Role                                  |
| --------------- | ------------------------------------- |
| `index.ts`      | 하위 entry point의 이름 있는 재노출   |
| `filesystem/`   | 읽기·원자 쓰기·잠금·symlink 검사      |
| `paths/`        | 상태 루트와 portable 경로 연산        |
| `hostRegistry/` | 호스트 테이블과 명시적 호스트 해석    |
| `hostPaths/`    | 런타임 프로젝트/플러그인 좌표         |
| `instructions/` | 마커 문서 순수 문자열 연산            |
| `spawn/`        | 외부 CLI 실행                         |
| 그 밖의 `*/`    | 훅·바이너리·shim·launcher 호환 어댑터 |

## Conventions

- 각 하위 디렉터리는 자체 `INTENT.md`와 `index.ts`가 있는 fractal이다.
- 하위 fractal은 상대의 entry point만 소비하며 의존성 그래프를 DAG로 유지한다.
- `hostRegistry`는 내부 의존이 없는 leaf다.

## Boundaries

### Always do

- 새 하위 fractal을 루트 `index.ts`와 package exports에 함께 노출한다.
- 시스템 호출과 순수 정책을 분리한다.

### Ask first

- `src/` 루트 peer 파일 추가.
- 하위 fractal 간 새 의존 간선 추가.

### Never do

- 루트 `index.ts`에 선언 구현.
- 소비자가 하위 내부 파일을 entry point 우회해 import.

## Dependencies

- 내부: 공개 하위 fractal.
- 외부: 각 하위 fractal이 자체 소유.
