# DETAIL — run_r 실행 계약

## Requirements

- LLM 이 생성한 R 코드를 `--vanilla` 헤드리스 Rscript + temp 워크스페이스로만 실행한다.
- 실행 전 `validateRScript` 정적 게이트가 `FORBIDDEN_R_CALLS`(process·network·filesystem-escape) 를 차단한다.
- 입력 데이터(`dataRefs`)는 MCP 가 워크스페이스 `data/` 로 복사하고 `refs.json` 으로만 노출한다. user R 코드는 경로를 직접 만들지 않는다.
- `timeoutMs` 는 `MAX_TIMEOUT_MS` 로 clamp, `dataRefs` 는 `MAX_DATA_REFS` 로 제한한다.

## API Contracts

### run_r 입력

- `scriptCode` (필수): `MAX_SCRIPT_CHARS` 이하 R 소스.
- `dataRefs[]` (선택): `{ id, format, path, encoding?, sha256? }`.
  - `id`: `^[A-Za-z0-9_-]+$` — 복사본 파일명이 되므로 경로 구분자 금지(워크스페이스 탈출 차단).
  - `path`: **절대경로 + allow-root 하위(realpath 기준)만 허용** — 아래 위협 모델 참조.
- `sessionMode`/`executionMode`/`timeoutMs`/`seed`/`workspaceId`: 실행 격리·모드 제어.
- `project_root` (선택): 워크스페이스 디렉토리 절대경로. Claude Code 에서는 생략(서버가 워크스페이스에서 기동됨) — 플러그인 설치 디렉토리에서 기동하는 호스트에서는 필수.

### 데이터 경로 위협 모델 (`dataRefs[].path`)

- **위협**: 복사 주체는 게이트된 R 이 아니라 MCP(신뢰 코드)다. 무제한 `path` 는 R 정적 게이트를 우회해 임의 호스트 파일(`~/.ssh/id_rsa`, `/etc/*`)을 `data/` 로 끌어와 무해한 read 로 유출하는 exfil 증폭 채널이 된다.
- **완화**: `resolveDataRefs` 가 `realpath(path)` 를 allow-root 하위로 강제한다(심링크 탈출 포함 거부). 위반 → `DATA_REF_OUTSIDE_ROOT`.
- **allow-root**: 기본 프로젝트 루트 — Claude Code 에서는 `process.cwd()`(MCP 를 기동한 프로젝트 디렉토리), 그 외 호스트에서는 `project_root` 로 전달된 절대경로. **미전달 시 `process.cwd()` 폴백 없이 `project_root` 재전달을 안내하며 throw** 한다(projectRoot 가드 — 이 안내 메시지는 `DATA_ROOT_INVALID` 로 가려지지 않는다). `R_STATISTICS_DATA_ROOT` 로 재정의하며, **지정된 루트가 realpath 로 해석 불가일 때만** `DATA_ROOT_INVALID`.
- 실행 안전 계층만 담당 — 통계 정책은 assert 소관.

## Acceptance Criteria

### AC-data-ref-containment — 입력 경로 격리

- 경로 구분자를 포함한 ref `id` 는 거부된다(traversal 가드).
- allow-root 하위의 정상 ref 는 `data/` 로 복사되고 `refs.json` 이 작성된다.
- ref 가 하나도 없으면 `refs.json` 을 만들지 않는다.
- allow-root 밖을 가리키는 절대경로는 `DATA_REF_OUTSIDE_ROOT` 로 거부된다(exfil 가드).
- 루트 안에 있으나 realpath 가 밖으로 나가는 심링크도 거부된다.
- 상대경로 원본은 거부된다 — 절대경로만 허용한다.

### AC-data-root-resolution — allow-root 판정

- `project_root` 가 전달되지 않은 호스트에서는 `process.cwd()` 로 폴백하지 않고 재전달 안내로 throw 한다.
- 지정된 루트가 realpath 로 해석 불가일 때만 `DATA_ROOT_INVALID` 이며, 위 안내 메시지가 이 코드로 가려지지 않는다.

### AC-wrapper-contract — 실행 래퍼 규약

- 래퍼는 init 과 사용자 코드보다 먼저 공통 실행계약(`shared/contract.R`)을 로드한다.
- 패키지 로드 전에 `R_STATISTICS_LIB` 를 `.libPaths` 앞에 붙인다.
- 빈 스크립트는 거부한다.

### AC-shutdown-classification — 종료 코드 해석

- Windows `0xC0000005` 는 `finalize.ok` 가 있으면 성공으로 분류한다.
- `finalize.ok` 가 없으면 실패로 유지한다.
- 비-Windows 의 같은 코드는 `finalize.ok` 가 있어도 실패로 유지한다.

### AC-statistical-calibration — 수치 정합성

- 알려진 입력에 대해 t 검정·상관·회귀·분산분석·Mann-Whitney·카이제곱이 기대 통계량을 재현한다.

## History

- 2026-07-15 — allow-root 해석 실패 시 projectRoot 가드 안내를 `DATA_ROOT_INVALID` 로 삼키던 결함을 고쳤다(M2-4 실측). 두 실패를 분리했다: `project_root` 미전달은 재전달 안내 throw, 지정 루트 realpath 불가는 `DATA_ROOT_INVALID`.
- 2026-07-12 — `dataRefs[].path` allow-root containment 를 도입했다(operations-sre-3 부채 해소).

## Last Updated

2026-07-30 — 기존 테스트를 근거로 acceptance group 5개를 명시하고, 이전 계약 변경 기록을 `History` 로 옮겼다.
