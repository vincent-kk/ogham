# preToolUse

## Purpose

PreToolUse 이벤트 디스패처. matcher 가 `*` 로 통합되므로 한 물리 호출을 순서 있는 논리 도구 호출로 정규화해 `tool_name` 으로 라우팅한다 — `Write|Edit|Delete`→layerGuard(차단 가능), `Read|Grep|Glob`→vaultRedirector(권고). 어느 guard 의 deny 든 전체 호출을 차단하고 lifecycleDispatcher 는 물리 호출당 정확히 한 번 실행한다.

## Conventions

- 헬퍼·공유 관심사 는 concrete 경로로 import (배럴 `index.js` 금지)
- 차단은 `hookSpecificOutput.permissionDecision:"deny"` + `permissionDecisionReason` 으로 신호 (top-level `continue:false` 금지 — 턴 중단 + reason 유실)
- 정규화 실패는 원래 cwd에서 `.git`/filesystem root까지 제한해 ancestor vault marker를 찾는다 — vault 안에서는 deny, 밖에서는 pass

## Boundaries

### Always do

- 논리 호출을 입력 순서대로 모두 guard 에 전달하고 결과를 deny-wins 로 병합
- 성공 batch 는 첫 논리 operation 을 matcher 입력으로, malformed 는 원래 물리 입력을 사용해 lifecycle 을 정확히 한 번 실행
- 각 관심사를 `safeConcern` 으로 감싸 격리

### Ask first

- 라우팅 규칙·관심사·malformed 범위 판정 변경

### Never do

- entry / orchestrator 에 로직 인라인 (helpers 경유)
- 배럴(index.js) import (훅 번들 비대)
- 첫 allow 에서 batch 판정을 끝내거나 뒤 operation 의 deny 를 버리기
- 논리 operation 마다 lifecycle 을 반복하거나 성공 batch 의 첫 operation 이 아닌 입력으로 matcher 를 바꾸기
