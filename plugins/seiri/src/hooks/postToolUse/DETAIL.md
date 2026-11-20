# postToolUse — Contract

## Requirements

- Only an exact paired invocation in the active actor/turn/generation can transition the workflow lifecycle state machine or record the active task's Bash evidence. Skill loading has no effect.
- `created` and `switched` transitions inject one progress-line-formatted acknowledgment naming the task, intent, and current step; `mismatch` injects one notice naming the bound task and the ways out: finish it, or enter the requested task through `write-plan` or `execute`. `rejected` injects nothing. `updated` injects nothing only for a same-task `step`; an explicit `resume`, `pause`, or `finish` acknowledges on `updated` in the prior control-verb ACK text; a request naming a different bound task yields the mismatch notice instead.
- 지침 연결은 수명주기 호출 짝을 요구하지 않는다. standard/strict의 메인 행위자 PostToolUse에서 호스트 고유 runtime 도구 이름, `directives/bind` 입력, 오류 없는 응답의 accepted·op·set·scope 일치, 요청과 cwd의 저장소 실경로 일치를 검증한다. 기록이 커밋되면 묶음 이름과 범위, 파일 수를 한 줄로 ACK한다.
- off/advisory suppress new observations and injection; trusted boundaries still suspend existing participation.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. Empty additional context produces no stdout.
- Shared normalization hashes Claude `prompt_id` or Codex `turn_id` as the main actor's turn and `JSON.stringify(['agent', agent_id])` as a child's turn; `tool_use_id` identifies the call. No IDs come from model arguments.

## Acceptance Criteria

### AC-conditional-participation — Explicit scope

- Inactive sessions receive no progress-line acknowledgment or gate writes.
- Bound workflows cannot cross turns, actors, tasks or invocation generations through late results.
- A non-entry `step`, `resume`, `pause`, or `finish` naming a task other than the bound one leaves state untouched and injects one mismatch line instead of an acknowledgment; so does an `implement` step while a different task is active. A `write-plan` or `execute` step naming a different task switches instead, and `implement` creates a binding when none exists.

### AC-native-invocation-provenance — Recorded host envelopes

- Recorded Claude and Codex fixtures retain matched invocation identities, independent children and their distinct successful MCP response envelopes.
- Synthetic race tests do not claim to reproduce native host scheduling.

## Last Updated

Update when the paired invocation, acknowledgment, or task evidence contracts change.
