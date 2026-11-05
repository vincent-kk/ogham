# DETAIL — run_r 실행 계약

## Requirements

- LLM 이 생성한 R 코드를 `--vanilla` 헤드리스 Rscript + temp 워크스페이스로만 실행한다.
- 실행 전 `validateRScript` 정적 게이트가 `FORBIDDEN_R_CALLS`(process·network·filesystem-escape) 를 차단한다.
- 입력 데이터(`dataRefs`)는 MCP 가 격리 워크스페이스의 전용 입력 영역으로 복사하고 `refs.json` 으로만 노출한다. user R 코드는 경로를 직접 만들지 않는다.
- 모든 `run_r` 결과는 실행 환경과 같은 `MANAGED_R_LIB_DIR` 을 `managedLibraryPath` 로 노출한다. setup은 이 값을 설치 대상의 유일한 출처로 사용한다.

## API Contracts

- 실행 래퍼는 공통 R 계약을 사용자 코드보다 먼저 로드한다. 관리형 library는 패키지 로드 전에 적용하여 setup과 runtime이 같은 설치를 사용하게 한다.

### Data path threat model

- **위협**: 복사 주체는 게이트된 R 이 아니라 MCP(신뢰 코드)다. 무제한 `path` 는 R 정적 게이트를 우회해 임의 호스트 파일(`~/.ssh/id_rsa`, `/etc/*`)을 격리 입력 영역으로 끌어와 무해한 read 로 유출하는 exfil 증폭 채널이 된다.
- **완화**: `resolveDataRefs` 가 `realpath(path)` 를 allow-root 하위로 강제한다(심링크 탈출 포함 거부). 위반 → `DATA_REF_OUTSIDE_ROOT`.
- **allow-root**: 기본 프로젝트 루트 — Claude Code 에서는 `process.cwd()`(MCP 를 기동한 프로젝트 디렉토리), 그 외 호스트에서는 `project_root` 로 전달된 절대경로. **미전달 시 `process.cwd()` 폴백 없이 `project_root` 재전달을 안내하며 throw** 한다(projectRoot 가드 — 이 안내 메시지는 `DATA_ROOT_INVALID` 로 가려지지 않는다). `R_STATISTICS_DATA_ROOT` 로 재정의하며, **지정된 루트가 realpath 로 해석 불가일 때만** `DATA_ROOT_INVALID`.
- 실행 안전 계층만 담당 — 통계 정책은 assert 소관.
- ref 식별자는 복사본 파일명이므로 경로 구분자를 허용하지 않는다.

## Acceptance Criteria

### AC-data-root-resolution — allow-root 판정

- `project_root` 가 전달되지 않은 호스트에서는 `process.cwd()` 로 폴백하지 않고 재전달 안내로 throw 한다.
- 지정된 루트가 realpath 로 해석 불가일 때만 `DATA_ROOT_INVALID` 이며, 위 안내 메시지가 이 코드로 가려지지 않는다.

### AC-managed-library-path — 관리형 library 단일 경로

- sync, async, 정적 차단, R 미탐색 결과 모두 `buildRunEnv().R_STATISTICS_LIB` 와 같은 `managedLibraryPath` 를 가진다.
- 같은 프로세스에서 `get_r_job` 폴링과 setup 재검증이 그 경로를 바꾸지 않는다.
- Codex/Claude 및 깨끗한 home에서 setup 문서는 호스트 환경을 재해석하지 않고 구조화 결과만 사용한다.

## Last Updated

입력 경로 위협 모델·R 실행 래퍼·관리형 library 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
