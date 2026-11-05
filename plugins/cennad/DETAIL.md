# cennad — Contract

## Structure

- `bridge/claude`는 Claude 런타임이고, `bridge/codex`는 compiler 설정 `codexHookRuntime`이 선택하는 Codex 런타임이다. bridge 루트의 MCP 서버는 모든 호스트가 공유한다.
- 두 호스트 모두 플러그인 디렉터리 전체를 설치한다 — 이 분리는 설치 범위가 아니라 실행 경로를 나눈다.

## Requirements

- Codex CLI·Antigravity CLI·Claude CLI 로 작업을 위임하는 플러그인이다. 위임 판단은 config 가 정하고, 훅은 상태만 알린다.
- **비율은 위임의 근거가 아니다.** 훅이 보고하는 점유율은 관측이며, 그것을 맞추려고 위임하지 않는다. 사용자 지시가 언제나 우선한다.
- 권한 플래그(`yolo`·`sandbox`)는 config 단독 채널이다 — MCP 입력으로 노출하지 않는다.
- 외부 CLI 의 자체 세션 파일을 수정·삭제하지 않는다.
- `bridge/`·`public/` 은 커밋하는 빌드 산출물이며 손편집하지 않는다.
- README 는 영어, 한국어는 `README-ko_kr.md` 로 분리한다. 설정 UI 문구도 영어를 유지한다.
- provider 스킬의 Claude 정본은 background completion notification으로 재개하고, plugin compiler가 만드는 Codex skill variant는 child target을 보관해 최종 응답 전에 `wait_agent`로 mailbox update를 기다리고 sender를 대조한다.
- 공개 위임 절차를 보존한 prompt budget은 매 호출 context 비용과 문서 drift를 제한한다.
- Claude의 completion notification과 Codex의 explicit child join을 host-marked lifecycle로 분리한다. Codex parent turn이 먼저 끝나 courier 결과 relay가 유실되는 것을 막으면서 Claude의 대기 계약을 보존하기 위함이다.
- crosscheck는 참여자당 정교화 없는 1콜만 쓰므로 courier가 더할 판단이 없다. 호스트가 2분을 넘긴 MCP 호출을 background task로 옮기므로 courier 없이도 비블로킹 위임이 성립한다.

## API Contracts

- provider 스킬의 host-marked lifecycle은 호스트별 대기 계약을 분리한다. Claude 원본은 notification으로 재개하고 Codex 생성본은 보관한 child target의 mailbox 결과를 확인한 뒤 final을 보낸다.
- courier는 provider 스킬의 정교화·실패 remedy·tier 의미론을 맡으며 crosscheck는 이를 경유하지 않는다.

## Acceptance Criteria

### AC-config-owns-routing — 라우팅 소유권

- 위임 대상 결정이 config 의 활성·electable 판정에서 나오고 훅이 이를 강제하지 않는다.
- 비활성 provider 호출이 `error.code='disabled'` 로 거부된다.

### AC-permission-channel — 권한 채널 분리

- MCP 입력 스키마에 권한 플래그가 없다.

### AC-external-session-untouched — 외부 세션 불가침

- 외부 CLI 의 세션 인덱스 파일을 읽기 외로 건드리지 않는다.

### AC-hook-budget — 훅 예산

- SessionStart 는 1회, UserPromptSubmit 는 3줄 이하를 주입한다.

### AC-courier-scope — courier 경유 범위

- provider 스킬 3종만 `courier` 를 spawn 하고, crosscheck 는 MCP 도구를 직접 호출한다.

### AC-host-lifecycle — 호스트별 courier 회수

- Claude가 읽는 provider 스킬 3종은 background completion notification 계약을 유지하고 Codex 전용 도구명을 노출하지 않는다.
- Codex가 읽는 생성 provider 스킬 3종은 `spawn_agent` target 보관, `wait_agent` mailbox 대기, returned sender와 target 대조를 지시하며 끝난 parent turn의 자동 재개를 기대하지 않는다.
- 두 호스트 모두 같은 courier prompt, fallback, report relay, stop, tier 계약을 공유한다.

### AC-skill-prompt-budget — 행동 보존형 prompt 축약

- provider source prompt는 각각 380단어 이하, crosscheck entrypoint와 조건부 reference 묶음은 900단어 이하, 네 스킬과 두 reference의 합계는 2,000단어 이하를 유지한다.
- Codex 생성 provider prompt는 각각 480단어 이하를 유지한다.
- budget 축약은 공개 skill/argument surface, provider lifecycle, resume·tier·relay·stop, crosscheck participant·failure·convergence 계약을 제거하지 않는다.

## Last Updated

위임 라우팅 소유권·호스트별 courier 회수·prompt budget 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
