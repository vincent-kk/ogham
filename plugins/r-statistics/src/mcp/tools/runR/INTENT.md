## Purpose

`run_r` 도구 핸들러. 격리된 Rscript 실행과 아티팩트 수집 결과에 setup이 그대로 재사용할 관리형 library 경로를 함께 제공한다.

## Conventions

- 실행 전 `validateRScript` 정적 게이트 통과 필수 (실패 → `COMMAND_BLOCKED`)
- Rscript 미탐색 → `R_NOT_FOUND` (setup 안내)
- 기본 `executionMode=async` (jobId 반환 후 get_r_job 폴링), `sync` 는 즉시 결과
- 모든 잡은 jobStore 에 등록 (사전 실패도 synthetic 잡으로 일관 반환)
- 데이터 ref 경로는 allow-root(`R_STATISTICS_DATA_ROOT`, 기본 프로젝트 루트) 하위 realpath 만 수용
- 선택 인자 `project_root`(절대경로)는 핸들러 진입 즉시 `rememberProjectRoot` 로 기억 — allow-root 를 해석하는 깊은 leaf(`inputDataRoot`)가 이를 소비한다 (Claude 에서는 무시되어 기존 CWD 동작 유지)
- 모든 상태 봉투는 module graph가 확정한 `MANAGED_R_LIB_DIR` 을 노출한다.

## Boundaries

### Always do

- `--vanilla` + temp 격리 + 명령 게이트로만 실행
- timeout 은 `MAX_TIMEOUT_MS` 로 clamp
- setup에 경로를 다시 계산시키지 않고 `managedLibraryPath`를 반환

### Ask first

- 입력 스키마(dataRefs/sessionMode) 변경
- 래퍼 주입 방식 변경

### Never do

- 통계 가정·기법 적합성 판단 (assert 소관)
- ARTIFACTS_DIR 밖 산출물 수용
- allow-root 밖 데이터 ref 경로 수용 (심링크 탈출 포함)
