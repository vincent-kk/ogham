# cennad — Contract

## Requirements

- Codex CLI·Antigravity CLI·Claude CLI 로 작업을 위임하는 플러그인이다. 위임 판단은 config 가 정하고, 훅은 상태만 알린다.
- **비율은 위임의 근거가 아니다.** 훅이 보고하는 점유율은 관측이며, 그것을 맞추려고 위임하지 않는다. 사용자 지시가 언제나 우선한다.
- 권한 플래그(`yolo`·`sandbox`)는 config 단독 채널이다 — MCP 입력으로 노출하지 않는다.
- 외부 CLI 의 자체 세션 파일을 수정·삭제하지 않는다.
- `bridge/`·`public/` 은 커밋하는 빌드 산출물이며 손편집하지 않는다.
- README 는 영어, 한국어는 `README-ko_kr.md` 로 분리한다. 설정 UI 문구도 영어를 유지한다.

## API Contracts

- **MCP 도구 4종**(서버 이름 `tools`): `start_conversation`, `continue_conversation`, `stop_conversation`, `open_settings`.
- **훅 2종**: SessionStart 정적 정책, UserPromptSubmit 라이브 상태.
- **스킬 5종**: `codex`, `antigravity`, `claude`, `crosscheck`, `setup`.
- **에이전트 1종**: `courier` — provider 스킬 3종이 spawn 하는 백그라운드 위임 러너. crosscheck 는 미경유.

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

## History

- 2026-08-04 — crosscheck 를 courier 미경유로 바꿨다. crosscheck 는 정교화 없이 참여자당 1콜만 쓰므로 courier 가 더할 판단이 없고, 호스트가 2분을 넘긴 MCP 호출을 background task 로 옮기므로 비블로킹도 courier 없이 성립한다.

## Last Updated

2026-08-04 — courier 경유 범위를 provider 스킬 3종으로 좁혔다.
