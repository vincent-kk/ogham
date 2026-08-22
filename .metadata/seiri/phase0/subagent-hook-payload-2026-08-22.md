# 실측 — 서브에이전트의 Bash 호출과 훅 페이로드 (2026-08-22)

**물음**: 서브에이전트(Agent 도구)가 돌린 Bash에 프로젝트 훅이 발화하는가. 발화한다면 `session_id`는 부모와 같은가, 에이전트를 식별할 필드가 있는가. — 04-GATES §4(위임)와 §11(측정)의 열린 항목.

**방법**: 스크래치 디렉토리에 `.claude/settings.json`으로 프로브 훅 4종(PostToolUse·PostToolUseFailure matcher `Bash`, SubagentStart·SubagentStop matcher `*`)을 걸고, 훅은 stdin 페이로드를 그대로 JSONL로 기록. `claude -p … --dangerously-skip-permissions --max-turns 12 --model sonnet`로 헤드리스 실행. 프롬프트: 부모가 `echo parent-probe` → Agent 도구로 서브에이전트(general-purpose) 하나 → 서브에이전트가 `echo child-probe`와 `false`(비0 종료) → `done` → 부모 `finished`. Claude Code **2.1.239**. 39초, $0.20.

## 결과

| 물음 | 답 | 근거 |
| --- | --- | --- |
| 서브에이전트의 Bash에 훅이 발화하는가 | **발화한다** | 서브에이전트의 `echo child-probe` → PostToolUse, `false` → PostToolUseFailure(`error: "Exit code 1"`, `is_interrupt: false`, `tool_response` 없음) |
| `session_id` | **부모와 동일** | 5건 전부 `982859b4-656e-4262-bb83-941f1417f617` |
| 에이전트 식별 필드 | **있다 — 서브에이전트 쪽에만** | `agent_id: "aa8d87f5564af18d4"`, `agent_type: "general-purpose"`. 부모의 PostToolUse 페이로드에는 두 필드가 없다 |
| 환경변수 | 없다 | 훅 프로세스에 `CLAUDE_SESSION_ID`·`CLAUDE_AGENT_ID` 모두 미설정 — 페이로드가 유일한 채널 |
| SubagentStart | 발화 | `agent_id`·`agent_type`·`session_id`·`prompt_id` |
| SubagentStop | 발화 | 위 + `agent_transcript_path`(`…/subagents/agent-<id>.jsonl`)·`last_assistant_message`·`stop_hook_active`·`background_tasks`·`session_crons` |
| 그 외 공통 필드 | — | `prompt_id`·`permission_mode`·`effort`·`tool_use_id`·`duration_ms`·`transcript_path`. PostToolUse의 `tool_response`는 `stdout`·`stderr`·`interrupted`·`isImage`·`noOutputExpected` — exit code 없음(02-ARCHITECTURE §4의 2.1.218 실측과 일치) |

## 귀결 (04-GATES에 반영)

- 위임자의 CHECK 실행도 같은 원장에 기록된다 — 같은 세션, 같은 훅.
- 훅은 `agent_id` 유무로 위임자의 실행을 구분할 수 있으므로, EVIDENCE에 `(via agent <id 앞 8자>)` 표지를 붙이고 `status`가 `met_by_agent`를 따로 센다. 드라이버의 재실행이 표지를 지운다.
- 박스를 뒤집지 않는 설계는 택하지 않는다 — 드라이버 자신이 서브에이전트인 구성에서 아무것도 뒤집히지 않는다.

## 원자료 (페이로드, 긴 필드 절단)

```jsonl
{"hook_event_name":"PostToolUse","session_id":"982859b4-656e-4262-bb83-941f1417f617","tool_name":"Bash","tool_input":{"command":"echo parent-probe"},"tool_response":{"stdout":"parent-probe","stderr":"","interrupted":false,"isImage":false,"noOutputExpected":false},"permission_mode":"bypassPermissions","effort":{"level":"xhigh"},"tool_use_id":"toolu_01JKtFVmJ2kb82o8Bdc3Wi8x","duration_ms":378}
{"hook_event_name":"SubagentStart","session_id":"982859b4-656e-4262-bb83-941f1417f617","agent_id":"aa8d87f5564af18d4","agent_type":"general-purpose","prompt_id":"9a20cf8d-45b4-4773-ae7c-0fc9f0c3bfd7"}
{"hook_event_name":"PostToolUse","session_id":"982859b4-656e-4262-bb83-941f1417f617","agent_id":"aa8d87f5564af18d4","agent_type":"general-purpose","tool_name":"Bash","tool_input":{"command":"echo child-probe"},"tool_response":{"stdout":"child-probe","stderr":"","interrupted":false,"isImage":false,"noOutputExpected":false},"tool_use_id":"toolu_011Lu5rpKS2R1vmtwaaybsDm","duration_ms":15}
{"hook_event_name":"PostToolUseFailure","session_id":"982859b4-656e-4262-bb83-941f1417f617","agent_id":"aa8d87f5564af18d4","agent_type":"general-purpose","tool_name":"Bash","tool_input":{"command":"false"},"error":"Exit code 1","is_interrupt":false,"tool_use_id":"toolu_011VShVA8t6HuReyJNDsVNYm","duration_ms":19}
{"hook_event_name":"SubagentStop","session_id":"982859b4-656e-4262-bb83-941f1417f617","agent_id":"aa8d87f5564af18d4","agent_type":"general-purpose","stop_hook_active":false,"agent_transcript_path":"…/subagents/agent-aa8d87f5564af18d4.jsonl","last_assistant_message":"done","background_tasks":[],"session_crons":[]}
```

프로브 훅(`probe-hook.mjs`, 14줄)은 stdin JSON을 읽어 `tool_response` 문자열 80자·`error` 120자로 잘라 append 하고 `{"continue":true}`를 낸다. 재현은 같은 settings.json과 프롬프트로 충분하다.
