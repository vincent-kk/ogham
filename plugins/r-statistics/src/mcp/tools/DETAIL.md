# tools — Contract

## Requirements

- 각 도구는 독립 fractal 이며 공용 경계를 얇게 유지하고, 복잡한 실행 단계는 해당 fractal 내부에 캡슐화한다.
- 핸들러는 stateless 하다 — 호출 간 상태는 `jobStore`(런타임)와 워크스페이스(디스크)에만 있다.
- 실행 안전(`run_r`)과 통계 정책(`assert_analysis_plan`)은 서로의 책임을 침범하지 않는다.
- `index.ts` 는 네 핸들러와 그 입출력 타입만 이름으로 재노출한다.
- `run_r` 와 `get_r_job` 출력의 `managedLibraryPath` 는 setup 설치와 runtime `.libPaths` 를 연결하는 구조화 계약이다.

## API Contracts

- `handleRunR(input: RunRInput): Promise<RunROutput>` — R 코드를 격리 워크스페이스에서 실행하고 아티팩트를 수집한다.
- `handleGetRJob(input: GetRJobInput): Promise<RunROutput>` — 비동기 잡 상태·결과 조회. 읽기 전용·idempotent 이며 `includeStdout=false` 면 스트림을 제거한다.
- `handleCancelRJob(input: CancelRJobInput): Promise<CancelRJobOutput>` — 실행 중 잡을 취소한다. idempotent.
- `handleAssertAnalysisPlan(...)` — 정규화된 분석 계획에 통계 hard gate 를 적용한다. 입력의 순수 함수.

## Acceptance Criteria

### AC-tool-surface — 도구 표면

- 배럴이 노출하는 핸들러가 정확히 4개이고, 각 핸들러는 자신의 fractal 배럴에서만 온다.
- 도구 fractal 사이의 직접 import 가 0건이다.
- 실행·폴링 결과가 동일한 관리형 R library 경로를 노출한다.

### AC-tool-responsibility-split — 책임 분리

- `run_r` 경로에 통계 기법·가정 판정이 없다.
- `assert_analysis_plan` 경로에 프로세스 실행·파일시스템 쓰기가 없다.

## Last Updated

2026-08-23 — 관리형 R library 경로의 구조화 출력 계약을 추가했다.
