# tools — Contract

## Requirements

- 핸들러는 전송 입력 해독·공유 스키마 검증·저장을 조립할 수 있지만 상태 전이·요약 계산·실행 경로 정책은 core에 위임한다. 도구별로 도메인 규칙을 다시 정의하면 같은 문서를 저장하고 조회하는 판단이 갈라진다.
- 도구 9개 전부(`run*` · `manifest*` · `config*` · `open_settings`)가 선택 인자 `project_root`(절대경로)를 받아 `projectRoot(input.project_root)` 로 워크스페이스를 해석한다. `process.cwd()` 직접 호출은 플러그인 설치 디렉터리에서 서버를 띄우는 호스트에서 엉뚱한 경로를 가리킨다.
- Claude Code 에서는 `project_root` 를 생략한다 — 서버가 워크스페이스에서 실행되므로 `process.cwd()` 와 같다. 설치 디렉터리에서 띄우는 호스트에서는 필수이며, 없으면 해석 실패로 throw 한다.
- 핸들러는 `toolResult` · `toolError` 를 직접 부르지 않는다. `wrapHandler` 가 처리한다.
- 새 핸들러를 더할 때 서버 등록표 등록도 같은 변경에서 수행한다. 등록되지 않은 핸들러는 도구 표면에 없는 죽은 코드다.

## API Contracts

핸들러는 자식 진입점을 통해 공개한다. 설정 페이지 도구의 HTTP 수명은 그 자식 서버가 소유하고, 나머지 도구에 서버 상태를 섞지 않는다.

## Acceptance Criteria

### AC-tools-nine-handlers — 핸들러 9개

- `tools/index.ts` 가 노출하는 심볼 수가 9이고 모두 `handle` 로 시작한다.
- 각 핸들러가 `MCP_TOOL_NAMES` 의 도구 하나에 대응한다.

### AC-tools-project-root-resolution — 워크스페이스 해석

- `tools/**` 에 `process.cwd()` 직접 호출이 없다.
- 서버 등록표 의 9개 등록 전부가 inputSchema 에 `project_root` 를 optional 로 선언한다.

### AC-tools-thin-wrapper — 위임 유지

- 각 핸들러는 core 또는 자신의 자식 fractal에 도메인 판단을 위임한다. 공유 스키마를 호출할 수 있으나 상태 전이·스키마 규칙을 자체 재구현하지 않는다.

### AC-tools-no-direct-response — 응답 형식 위임

- `tools/**` 에 `toolResult(` · `toolError(` 직접 호출이 없다.

### AC-tools-registered — 등록 일치

- `tools/index.ts` 가 노출하는 모든 핸들러가 서버 등록표 에서 등록된다.

## Last Updated

도구 책임과 공개 호출 경계의 내용과 근거가 바뀔 때 갱신한다.
