# postToolUse

## Purpose

PostToolUse 이벤트 디스패처. matcher 가 `*` 로 통합되므로 `helpers/activityRecorder`는 `MAENCOF_MCP_TOOLS` allowlist 로 게이트한다(native 도구 기록 방지). 공유 `lifecycleDispatcher`는 raw physical tool name을 Pre와 같은 logical matcher로 해석하고 단일 envelope로 병합한다.

## Conventions

- 헬퍼·공유 관심사 는 concrete 경로로 import (배럴 `index.js` 금지)
- activityRecorder 는 `MAENCOF_MCP_TOOLS.has(tool_name)` 일 때만 실행

## Boundaries

### Always do

- 각 관심사를 `safeConcern` 으로 감싸 격리
- allowlist 게이트로 native 도구 기록 차단
- lifecycle matcher는 raw `tool_name`만 사용하고 `tool_response`는 판정에서 제외

### Ask first

- allowlist 변경 / 관심사 추가

### Never do

- entry / orchestrator 에 로직 인라인 (helpers 경유)
- 배럴(index.js) import (훅 번들 비대)
