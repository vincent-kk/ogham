# server — Filid 1.0 Contract

## Requirements

- MCP server는 정확히 4개의 Filid 1.0 도구만 등록한다.
- 모든 handler 입력을 Zod로 검증하고 성공·위반·불확실·미지원 상태를 공통 envelope로 반환한다.
- SDK 등록 스키마는 MCP object형 JSON Schema로 필드·enum/literal·minimum 의미를 광고하면서 validation 오류를 handler 경계로 전달하고, handler 경계가 조건부 제약을 포함한 원본 Zod 스키마로 다시 검증한다.
- inline JSON은 UTF-8 16 KiB 이하의 compact JSON이다.
- 예산을 넘는 payload는 plugin cache의 content-addressed artifact로 atomic write하고 inline에는 summary와 metadata만 남긴다.
- `restructure`의 `plan` payload는 크기와 무관하게 artifact를 남긴다.
- tool artifact의 절대 경로, media type, SHA-256, bytes와 ephemeral 표시는 실제 파일과 일치한다.
- boot sweep와 shutdown cache cleanup은 best-effort이고 project root 미해석 시 project-scoped 작업을 건너뛴다.

## API Contracts

- 등록 도구: `project_setup`, `fractal_inspect`, `restructure`, `review_state`.
- `ToolResultEnvelope<Summary, Data>`는 `status`, `summary`, optional `data`, optional `artifact`, `diagnostics`를 가진다.
- `toolResult(toolName, payload)`는 envelope를 compact MCP text content로 직렬화한다.
- `toolError(error)`는 transport 또는 trust-boundary 실패를 `isError: true` 응답으로 변환한다. 도구 계약이 stable diagnostic code를 가진 typed error를 던지면 그 코드를 보존하고, 그 외 실행 실패만 `tool-execution-error`를 쓴다.
- `wrapHandler(toolName, schema, handler)`는 schema·handler·artifact 오류를 일관된 tool error로 격리한다.
- `startServer()`는 stdio transport 연결 후 boot cleanup을 수행하고 동기 shutdown handler를 한 번 등록한다.
- `fractal_inspect`의 `resolve` action은 최소 한 item의 `requests` 배열을 받고, 한 shared snapshot에서 입력 순서대로 item 결과를 반환한다.

## Acceptance Criteria

### AC-server-surface — 도구 집합

- server tool list는 4개 이름과 set-equality를 이루고 제거된 도구를 포함하지 않는다.

### AC-server-envelope — 크기 제한

- 16 KiB 이하 data는 inline이고 초과 data는 생략되어 artifact로 전달된다.
- artifact bytes와 SHA-256이 envelope metadata와 일치한다.
- summary scan은 전체 tree를 inline하지 않는다.

### AC-server-validation — 구조화된 입력 오류

- `tools/list`는 각 도구의 필드와 enum/literal/minimum 제약을 유효한 MCP object JSON Schema로 광고한다.
- 광고된 제약을 위반한 실제 `tools/call`도 SDK raw error가 아니라 `isError: true`인 Filid 공통 error envelope를 반환한다.
- 입력 검증 실패는 `tool-input-invalid`, 도구 계약이 분류하지 않은 핸들러 실행 실패는 `tool-execution-error` 진단 코드를 쓴다. 도구 계약이 stable diagnostic code를 부여한 실행 실패는 그 코드를 보존한다. 입력 오류와 미분류 엔진 결함이 코드를 공유하면 호출자가 자기 인자를 고쳐야 하는지 엔진 결함인지 구분할 수 없다.
- 모든 도구 input schema는 필드마다 `.describe()`를 갖는다. MCP 표면이 LLM 호출자에게는 유일한 계약이므로 이름만으로 의미가 서지 않는 필드 (`fractal_inspect`의 `scan` action `maxDepth` 같은 규칙 임계값)는 설명이 계약의 일부다.
- 도구 공통 project path 설명은 실제 root 해석과 일치한다. 공급된 절대 경로는 그대로 이 호출의 root가 되고 상향 탐색은 없다. `.filid/config.json`만 git 저장소 루트에서 읽힌다. 설명이 상향 해석을 주장하면 호출자는 하위 디렉터리를 넘겨 scope를 좁히는 동작을 예측할 수 없다.
- `fractal_inspect.requests`는 resolve-only 필드로 `minItems: 1`을 광고하고 각 item의 target과 optional comparison paths를 설명한다. 제거된 scalar `targetPath`와 `comparePaths`는 top-level 입력으로 허용하지 않는다.

### AC-server-lifecycle — host 안전성

- root 또는 session env가 없어도 server boot와 shutdown이 실패하지 않는다.

## History

- 2026-09-05 — 같은 lifecycle의 기능을 action union으로 묶어 server registry를 9개에서 4개로 줄였다.
- 2026-08-28 — `context_resolve`의 공개 입력을 shared-snapshot `requests[]` batch로 전환했다.

## Last Updated

2026-09-05 — 4-tool action schema와 기존 payload 보존 계약을 명시했다.
