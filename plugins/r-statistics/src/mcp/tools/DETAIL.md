# tools — Contract

## Requirements

- 각 도구는 독립 경계를 가지며 복잡한 실행 단계는 자기 내부에 둔다. 도구끼리 직접 호출하지 않는다.
- 핸들러는 호출 간 상태를 소유하지 않는다. 런타임 상태는 jobStore, 디스크 상태는 워크스페이스가 소유한다.
- 실행 안전과 통계 판정은 서로의 책임을 침범하지 않는다. 배럴은 공개 핸들러와 타입만 재노출한다.

## API Contracts

- 실행과 폴링의 관리형 library 경로는 동일한 구조화 계약이다. setup이 호스트 경로를 재계산하면 설치와 실행이 다른 라이브러리를 볼 수 있다.

## Acceptance Criteria

### AC-tool-surface — 도구 표면

- 배럴이 노출하는 핸들러가 정확히 4개이고, 각 핸들러는 자신의 fractal 배럴에서만 온다.
- 도구 fractal 사이의 직접 import 가 0건이다.
- 실행·폴링 결과가 동일한 관리형 R library 경로를 노출한다.

### AC-tool-responsibility-split — 책임 분리

- `run_r` 경로에 통계 기법·가정 판정이 없다.
- `assert_analysis_plan` 경로에 프로세스 실행·파일시스템 쓰기가 없다.

## Last Updated

도구 책임 분리와 관리형 library 공유 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
