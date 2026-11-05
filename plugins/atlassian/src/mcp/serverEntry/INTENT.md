## Purpose

esbuild CJS 번들 진입점. `node bridge/mcp-server.cjs` 실행 시 MCP 서버를 stdio 모드로 기동하는 단일 책임 파일.

## Conventions

빈 배럴과 실행 진입점을 구별한다. 기동 실패는 호스트가 알아볼 수 있도록 stderr와 비정상 종료로 전달한다.

## Boundaries

### Always do

- `startServer()` 호출만 수행하고 다른 로직 추가 금지
- 치명적 오류 발생 시 `process.stderr`에 기록 후 `process.exit(1)` 종료

### Ask first

- 번들 진입점 파일 분리 또는 추가 (빌드 파이프라인 영향)
- stdio 외 다른 시작 모드 추가

### Never do

- 도구 등록·설정 로드 등 서버 초기화 로직을 이 파일에 직접 구현
- `../server` 이외의 모듈을 직접 import하여 의존 범위 확장
- 오류를 무시하고 서버를 계속 실행
