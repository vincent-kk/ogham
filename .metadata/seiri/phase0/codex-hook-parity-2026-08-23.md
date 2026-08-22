# Codex hook parity — Phase 0 empirical record

Date: 2026-08-23 (Asia/Seoul)
Target: `plugins/seiri`
Codex CLI: `0.149.0`

## Question

게이트 판정 코드를 바꾸기 전에 다음 세 전제를 실측했다.

1. Codex가 seiri 훅 명령을 실제로 실행하는가.
2. Codex에서 Skill 로드가 PostToolUse로 관측되는가.
3. 현재 배포된 seiri MCP가 `gates` 도구를 실제로 노출하는가.

## Hook execution and payload

현재 세션의 seiri SessionStart와 UserPromptSubmit 주입이 실제로 나타났으므로 훅은 등록에 그치지 않고 실행됐다. 별도의 신뢰 저장소에서 임시 PostToolUse 훅을 설치하고 `codex exec`로 Bash 성공과 exit 7을 각각 한 번 실행해 stdin을 요약했다.

| Case         | Event         | `tool_response`                 | Exit field | Interrupt field |
| ------------ | ------------- | ------------------------------- | ---------- | --------------- |
| Bash success | `PostToolUse` | string (`CODEX_HOOK_SUCCESS\n`) | absent     | absent          |
| Bash exit 7  | `PostToolUse` | string (`CODEX_HOOK_FAILURE\n`) | absent     | absent          |

두 경우 모두 공통 키 `cwd`, `hook_event_name`, `model`, `permission_mode`, `session_id`, `tool_input`, `tool_name`, `tool_response`, `tool_use_id`, `transcript_path`, `turn_id`가 관측됐다. nonzero 실행에도 `PostToolUseFailure`는 오지 않았다. 프로브 저장소와 훅 파일은 측정 직후 제거했고 ogham 작업 트리에는 남기지 않았다.

Codex의 공식 [Hooks reference](https://learn.chatgpt.com/docs/hooks)는 PostToolUse가 Bash의 nonzero 결과에도 실행되고 `tool_response`를 JSON 값으로 전달한다고 명시하며, 별도 PostToolUseFailure 이벤트를 지원 이벤트로 열거하지 않는다.

## Plugin root variable

기존 seiri 명령은 `${CLAUDE_PLUGIN_ROOT}`를 사용한다. 공식 [plugin packaging reference](https://developers.openai.com/plugins/build/plugins)는 Codex 플러그인 훅 환경에 `PLUGIN_ROOT`, `PLUGIN_DATA`와 함께 호환 변수 `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`도 제공한다고 명시한다. 실제 seiri 훅 실행도 확인됐으므로 루트 변수는 바꾸지 않는다.

## Skill observation

현재 Codex 세션의 호출 가능 도구와 공식 훅 도구 표면에는 `Skill` 도구가 없다. 따라서 Claude의 `PostToolUse` matcher `Skill`이 기록하는 워크플로우 상태는 Codex에서 관측되지 않는다. 이름이 불명확한 다른 도구를 대체 신호로 추측하지 않고, 이 차이를 호스트 계약에 남긴다.

## MCP gates reproduction

측정 당시 현재 세션의 seiri MCP 표면에는 `open_settings`, `rule_docs_sync`만 있고 `gates`가 없었다. 설치 cache와 빌드 전 작업공간의 shipped `bridge/mcp-server.cjs`는 byte-for-byte 같았고 둘 다 `gates` 등록 문자열을 포함하지 않았다. 반면 TypeScript source의 server registration에는 `gates`가 있었다.

재현 결과:

```text
EXPECTED registered MCP tool: gates
ACTUAL registered=false
FAIL gates tool missing from shipped MCP bundle
```

Git 추적은 원인을 생성 산출물 회귀로 좁혔다.

- `2134176a`: source에 gates registration 도입.
- `48611b26`: gates를 포함한 bridge bundle 생성.
- `885e2a31`: 여섯 bridge 산출물을 되돌려 gates bundle만 제거; source는 유지.

도구가 등록되기 전 단계에서 이미 실패했으므로 `.codex-plugin/plugin.json`의 `cwd: "."`나 `projectRoot(input.project_root)`는 이 증상의 원인이 아니다.

## Ownership decision

- Codex가 지원하지 않는 Claude 이벤트를 전용 훅 파일에서 제거하는 일은 모든 플러그인에 적용되는 호스트 어댑터 규칙이므로 `tools/plugin-compiler`가 소유한다.
- 문자열/객체 payload를 출력 텍스트로 정규화하고 EXPECT로 게이트를 판정하는 일은 seiri 계약이므로 `plugins/seiri`가 소유한다.
- 현재 훅 플러그인 중 미지원 이벤트를 가진 것은 seiri의 `PostToolUseFailure`뿐이다. compiler 변경은 공통 규칙으로 구현하되 이번 생성 산출물 변경은 seiri에 한정된다.

## Post-change evidence

- 생성된 `.codex-plugin/hooks.json`은 `SessionStart`, `UserPromptSubmit`, `PostToolUse`, `SubagentStart`만 가진다. Codex가 지원하지 않는 `PostToolUseFailure`는 compiler가 제거했다.
- 루트와 Codex manifest는 모두 `./.codex-plugin/hooks.json`을 가리킨다. 생성된 Codex 훅의 명령은 Claude 훅과 같아 `${CLAUDE_PLUGIN_ROOT}` 호환 변수를 그대로 쓴다.
- trusted ogham 저장소에 측정용 프로젝트 훅과 원장만 잠시 연결하고 Codex 0.149.0에서 `printf 'SEIRI_CODEX_PROBE_OK\n'`를 실행했다. 새 번들이 실제 `PostToolUse` 문자열 payload를 받아 `[seiri] codex-hook-probe G9 met — evidence recorded (1/1, all met)`를 추가 컨텍스트로 돌려주고 원장에 `EVIDENCE: SEIRI_CODEX_PROBE_OK`를 썼다. 측정용 훅·원장·임시 저장소는 확인 직후 제거했다.
- 새 `bridge/mcp-server.cjs`를 stdio로 띄워 `tools/list`를 호출한 결과는 `gates`, `open_settings`, `rule_docs_sync`였다. `gates`가 source뿐 아니라 shipped bundle에도 등록됐다.
- Claude 객체 성공·Claude 오류 실패·Codex 문자열·Codex exit header 문자열·빈 문자열의 다섯 fixture가 같은 정규화 organ을 지난다. 동일 출력의 두 호스트 fixture는 같은 판정 줄과 같은 원장 바이트를 냈다.
- `post-tool-use.mjs`는 15,390바이트로 16,384바이트 상한 안이다. 전체 검증 결과는 설계 원장 §10의 폐쇄 증거에 기록한다.
