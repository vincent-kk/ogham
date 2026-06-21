# preToolUse

## Purpose

PreToolUse 이벤트 디스패처. matcher 가 `*` 로 통합되므로 `tool_name` 으로 라우팅한다 — `Write|Edit`→`helpers/layerGuard`(차단 가능), `Read|Grep|Glob`→`helpers/vaultRedirector`(권고). 공유 `lifecycleDispatcher`는 항상 실행하고 단일 envelope로 병합한다.

## Structure

- `preToolUse.entry.ts` — 브리지 진입점
- `preToolUse.ts` — `orchestratePreToolUse` (라우팅 + 병합)
- `helpers/layerGuard/` — Layer 1(01_Core) 쓰기 차단
- `helpers/vaultRedirector/` — vault 문서 read → MCP 도구 권고

## Conventions

- 헬퍼·공유 관심사 는 concrete 경로로 import (배럴 `index.js` 금지)
- 차단은 stdout JSON `continue:false` 로 신호 (exit code 아님)

## Boundaries

### Always do

- 각 관심사를 `safeConcern` 으로 감싸 격리
- `tool_name` 으로 헬퍼 라우팅 (layerGuard 는 Write|Edit 전용)

### Ask first

- 라우팅 규칙 / 관심사 추가

### Never do

- entry / orchestrator 에 로직 인라인 (helpers 경유)
- 배럴(index.js) import (훅 번들 비대)
