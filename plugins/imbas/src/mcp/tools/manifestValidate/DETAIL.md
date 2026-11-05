# manifestValidate — Contract

## Requirements

- MCP 도구 `manifest_validate` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 얇은 위임이다. 실행 디렉터리 해석과 `core/manifestValidator` 호출 외에 아무것도 하지 않으며, 검증 규칙을 여기서 구현하거나 결과를 재해석하지 않는다.
- 매니페스트 부재·스키마 불일치는 오류 응답이 아니라 `valid: false` **결과**다 — 검증 도구에게 "없음"은 답이지 사고가 아니다.
- 읽기 전용이다(`readOnlyHint: true`). 검증이 매니페스트를 고치지 않는다.

## API Contracts

- core의 검증 결과를 가공하지 않는다. 경고를 차단 사유로 삼을지는 호출자의 판단이다.
- 안전한 세그먼트를 만들지 못한 입력은 검증 전에 거부한다.

## Acceptance Criteria

### AC-missing-file-is-a-result — 부재는 결과다

- 매니페스트 파일이 없으면 오류 응답이 아니라 `valid: false` 와 `Schema validation failed: …` 한 건을 담은 결과가 돌아온다.

### AC-result-passthrough — 결과 무가공 전달

- 응답의 `valid`·`errors`·`warnings` 는 `validateManifest` 가 만든 값과 동일하다 — 이 핸들러가 항목을 더하거나 걸러내지 않는다.

### AC-path-guard-precedes — 경로 가드 선행

- 경로 세그먼트를 벗어나는 `run_id` 는 검증 실행 전에 거부된다.

## Last Updated

검증 결과·오류 전달 계약의 내용과 근거가 바뀔 때 갱신한다.
