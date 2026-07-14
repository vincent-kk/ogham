## Purpose

Claude 정본을 Codex 가 그대로 소비할 때 **조용히 어긋나는 지점**을 진단으로 표면화한다. 어댑터 생성을 막지 않는 경고 계열이며, 생성물 자체는 바꾸지 않는다.

## Structure

| Path                         | Role                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `checks/lintHookEvents.ts`   | Codex 10-이벤트 셋 밖의 훅 이벤트 → `codex-unknown-event` 경고       |
| `checks/lintHookMatchers.ts` | PreToolUse/PostToolUse matcher 의 `Read` → `codex-read-matcher` 경고 |

## Conventions

- 순수 함수 — `PluginFacts` 만 읽고 `Diagnostic[]` 을 돌려준다.
- 메시지는 "무엇이·왜 문제인지"를 한 줄로 담는다 (호출부가 그대로 출력).

## Boundaries

### Always do

- 진단 코드(`code`)는 안정 문자열로 유지 — DETAIL.md 진단 표와 1:1.
- 판단 근거가 호스트 동작이면 근거 데이터를 `constants/hosts.ts` 상수로 둔다.

### Ask first

- 새 진단 코드 추가·level 승격(warning → error) — CI 게이트 동작이 바뀐다.

### Never do

- 디스크 I/O·어댑터 내용 변형 — 이 모듈은 읽고 판단만 한다.
- 진단을 이유로 생성 중단 (중단 판정은 `main.ts` 의 exit 코드 소관).

## Dependencies

- `constants/hosts.ts` (Codex 이벤트 셋), `types/` (PluginFacts · Diagnostic).
