## Purpose

`@ogham/cross-platform`은 Ogham 내부의 OS 경로, 파일 시스템, 프로세스 실행
호환성 계층이다. 플러그인과 상위 공유 패키지는 시스템 호출을 이 경계로
모은다.

## Structure

| Path                | Role                                     |
| ------------------- | ---------------------------------------- |
| `src/`              | 공개 TypeScript 소스와 루트 배럴         |
| `src/paths/`        | home/tmp/state root와 portable 경로 연산 |
| `src/filesystem/`   | 안전한 읽기·원자 쓰기·잠금·symlink 방어  |
| `src/host*/`        | 호스트 ID·상태 루트와 플러그인/문서 채널 |
| `src/configScope/`  | user/project 설정 레이어 해석과 병합     |
| `src/instructions/` | 마커 구간의 순수 문자열 연산             |
| `src/spawn/`        | 외부 CLI 실행 단일 진입점                |
| `src/binaries/`     | 외부 바이너리 탐지와 설치 안내           |
| 그 밖의 `src/*`     | 훅, shim, launcher 및 호스트 어댑터      |

## Conventions

- 패키지는 `private: true`이며 workspace 의존성으로만 소비한다.
- 상위 계층은 `node:fs`, `node:path`, `node:os`, `node:child_process` 대신
  이 패키지 루트만 import한다.
- 경로는 native와 Windows/POSIX 문자열 fixture에서 같은 의미를 가져야 한다.

## Boundaries

### Always do

- 일반 외부 CLI는 `spawnCli()`를 사용하고 stdout은 `normalizeEol()`로
  정규화한다. `selfProbeHook()`의 무출력 진단 실행만 Node builtin을 쓴다.
- 사용자 파일 교체는 sibling 임시 파일과 atomic rename을 사용한다.
- 프로젝트 하위 출력은 절대 루트, containment, symlink 검사를 거친다.

### Ask first

- 새 OS 또는 호스트 행 추가.
- 외부 npm 의존성 추가.

### Never do

- `dist/`를 커밋하거나 npm에 게시.
- 잠금 획득 실패 뒤 보호 없이 쓰기를 계속.
- 상위 패키지로 의존해 DAG를 역전.

## Dependencies

- 외부: `cross-spawn`, `which`, `env-paths`, Node.js 내장 모듈.
