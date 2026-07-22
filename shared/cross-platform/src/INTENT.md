# cross-platform

## Purpose

`src/` 는 `@ogham/cross-platform` 소스 루트(fractal). 배럴(`index.ts`) 이 하위 fractal 들을 하나의 공개 API 로 통합해 재노출한다. 패키지 레벨 계약(퍼블리시 금지, esbuild inline 전제 등)은 `../INTENT.md` 참조 — 본 문서는 내부 구조만 다룬다.

## Structure

| Path            | Role                                                          |
| --------------- | ------------------------------------------------------------- |
| `index.ts`      | 배럴 — 하위 fractal 재노출, 유일한 공개 API                   |
| `binaries/`     | which/where 디스커버리 + 24h 캐시 + 설치 가이드               |
| `env/`          | 환경변수 / OS 분기 / PATH delimiter 추상화                    |
| `eol/`          | 줄바꿈(CRLF→LF) / BOM 정규화                                  |
| `hooks/`        | hook bootstrap + selfProbe + errorLog                         |
| `hostPaths/`    | 호스트별 플러그인 루트 / 프로젝트 루트 해석                   |
| `hostRegistry/` | 호스트 테이블(이름·마커·상태 루트·훅 신호) 단일 진실원 — leaf |
| `launcher/`     | OS 기본 핸들러로 URL/파일 열기 (`openBrowser`)                |
| `paths/`        | home/tmp/config/cache 경로 + win/posix 경로 문자열 호환       |
| `shim/`         | Windows `.cmd` shim 생성 (빌드 스텝)                          |
| `spawn/`        | 외부 CLI spawn 단일 진입점(`spawnCli` 등) + 타임아웃          |

## Conventions

- 각 하위 디렉터리는 독립 fractal — 자체 `INTENT.md` + `index.ts` 배럴을 갖는다.
- 하위 fractal 간 상호 참조는 서로의 배럴(`../env/index.js` 등)만 경유, 내부 파일 직접 import 금지.
- `src/index.ts` 는 순수 재노출만 담는다 (index-barrel-pattern).

## Boundaries

### Always do

- 새 하위 fractal 추가 시 `src/index.ts` 에 재노출을 추가한다.
- 각 하위 fractal 은 고유 관심사 하나만 담당한다 — 겹치면 통합하거나 재배치한다.

### Ask first

- `src/` 루트에 새 peer 파일 추가 (zero-peer-file 위반 소지).
- 하위 fractal 간 순환 의존이 생길 수 있는 리팩터.

### Never do

- `src/index.ts` 에 함수/상수/클래스를 직접 선언.
- 소비 플러그인이 하위 fractal 내부 파일을 배럴 우회해 직접 import.

## Dependencies

- 내부: 하위 fractal 전부. `hostRegistry` 만 leaf(내부 의존 0) — `paths`·`hostPaths` 가 공유하는 호스트 지식을 사이클 없이 담기 위한 불변식.
- 외부: 없음 (각 하위 fractal 이 자체 외부 의존을 소유).
