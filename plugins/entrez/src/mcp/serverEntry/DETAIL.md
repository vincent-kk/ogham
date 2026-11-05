# serverEntry — Contract

## Requirements

- 이 fractal 은 esbuild 번들 진입점 하나다. `startServer()` 호출과 치명적 오류 처리 외에는 아무 로직도 갖지 않는다.
- 기동 실패는 stderr 에 사유를 남기고 `process.exit(1)` 로 끝낸다 — 프로세스 종료를 다루는 유일한 자리다.
- 형제 fractal 은 배럴로만 건넌다. `../server/index.js` 를 쓰고 `../server/lifecycle/*` 를 직접 참조하지 않는다.

## API Contracts

번들 실행 자체가 호스트와의 계약이다. 기동 실패는 stderr와 비정상 종료로 알리며 빈 배럴은 런타임 심볼을 제공하지 않는다.

## Acceptance Criteria

### AC-entry-minimality — 진입점 최소성

- 파일에 도구 등록·설정 로드 로직이 없다.
- `../server` 이외 모듈을 직접 import 하지 않는다.

### AC-entry-failure — 기동 실패 처리

- 기동 실패 시 stderr 에 사유가 남고 종료 코드가 1이다.

## Last Updated

번들 기동 책임과 실패 종료 계약이 바뀔 때 갱신한다.
