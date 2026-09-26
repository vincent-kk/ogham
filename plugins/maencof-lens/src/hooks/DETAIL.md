# hooks — Contract

## Requirements

- 호스트 훅 구현을 소유한다. 현재 이벤트는 SessionStart 하나이며, 각 이벤트의 esbuild 진입점이 호스트별 bridge 번들이 된다.
- 훅 출력은 JSON 으로 stdout 에 쓰고, 설정이 없으면 출력 없이 종료한다.
- 훅은 볼트 파일시스템에 쓰지 않는다 — 플러그인의 읽기 전용 계약을 훅에서도 지킨다.

## API Contracts

- `index.ts` 는 `runSessionStart` 와 `LensSessionStartResult` 타입을 재노출한다.
- 번들 진입점은 이 배럴을 거치지 않고 concrete 파일을 직접 import 한다 (훅 번들 크기 가드).

## Acceptance Criteria

### AC-hook-silent-without-config — 설정 부재 시 무출력

- 설정 파일이 없고 환경 진단 오류도 없으면 SessionStart 훅이 stdout 에 아무것도 쓰지 않는다.

### AC-hook-read-only — 쓰기 없음

- 훅 실행이 볼트 경로에 쓰기 호출을 하지 않는다.

## Last Updated

2026-09-26 — hooks fractal 계약을 처음 문서화했다.
