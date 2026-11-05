# serverEntry — Contract

## Requirements

- esbuild CJS 번들 진입점이다. `startServer()` 호출과 치명적 오류 처리 외에는 아무 로직도 갖지 않는다.
- 오류는 stderr 에 기록하고 `process.exit(1)` 로 끝낸다 — 이 신호가 없으면 호스트가 서버 죽음을 알 수 없다.
- 형제 fractal 은 배럴로만 건넌다: `../server/index.ts` 를 쓰고 `../server/server.ts` 를 직접 참조하지 않는다.

## API Contracts

번들 실행 파일 자체가 호스트와 맺는 계약이다. 빈 배럴에는 런타임 심볼이 없으며 기동 실패는 stderr와 비정상 종료로 호스트에 알린다.

## Acceptance Criteria

### AC-entry-minimality — 진입점 최소성

- 파일에 도구 등록·설정 로드 로직이 없다.
- `../server` 이외 모듈을 직접 import 하지 않는다.

### AC-fatal-signal — 실패 신호

- 기동 실패가 stderr 에 남고 종료 코드가 1이다.

## Last Updated

번들 기동 책임과 치명적 실패 전달 계약이 바뀔 때 갱신한다.
