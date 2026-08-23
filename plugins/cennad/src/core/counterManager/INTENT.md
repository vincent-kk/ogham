## Purpose

세션 카운터 저장소로 provider(codex / antigravity / claude) 호출 횟수를 추적한다. 호스트가 MCP와 훅에 같이 전달한 식별 채널로만 카운터를 격리하고, 식별자가 없으면 이전 값을 0으로 합성하거나 디스크에 쓰지 않는다.

## Conventions

- 디스크 JSON 키는 snake_case (`codex`, `antigravity`, `claude`, `host_session_id`)
- non-blank `CENNAD_HOST_SESSION_ID`를 우선하고, 유효한 `CLAUDE_PID`는 `claude-pid:<pid>`로 정규화한다. 둘 다 없으면 식별 불가다
- 기존 `parent_pid`는 동일한 Claude PID 세션에서만 읽는 마이그레이션 입력이다. 신규 write는 `host_session_id`만 쓴다
- +1 은 호출 시도 기준 — CLI 성공·실패 결과와 무관
- 모든 write 는 `atomicWrite` 경유 (tmp → rename)

## Boundaries

### Always do

- 식별된 세션의 기록만 재사용하고, 다른 세션 기록은 다음 write에서 새 식별자로 교체
- 호스트 세션을 식별할 수 없으면 `incrementCounter`는 카운터 파일을 쓰지 않음
- `incrementCounter` 는 `loadCounter` → 수정 → `atomicWrite` 순서로 실행

### Ask first

- counter 디스크 스키마 확장 (새 provider 추가 등)
- 카운트 정책 변경 (시도 기준 → 성공 기준 전환 등)

### Never do

- 락 없이 동시 write — MCP 단일 프로세스 가정 하에 직렬 처리
- 외부에서 세션 카운터 저장 파일 직접 mutation
- 세션 식별 불가 상태에서 이전 카운트 값 사용 또는 디스크 write
