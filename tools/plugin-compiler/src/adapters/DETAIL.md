# adapters — Contract

## Requirements

- 공개 빌더는 정본에서 읽은 facts를 호스트별 순수 객체로 동기 변환하며 디스크 I/O나 정본 변경을 수행하지 않는다.
- 동일 facts는 키와 파일 경로 순서가 안정된 결과를 만들어 `stableJson` 직렬화의 바이트 결정성을 보존한다.
- 조건부 산출물이 필요하지 않으면 `null`을 반환하고, 생성 여부 판정은 매니페스트가 가리키는 표면과 일치해야 한다.

## API Contracts

- Codex 매니페스트는 허용된 메타데이터만 복사하고 실제로 방출되는 스킬 및 훅 변이와 같은 판정으로 참조를 선택하며, MCP facts가 있을 때만 서버 선언을 포함한다.
- MCP 변환은 `${CLAUDE_PLUGIN_ROOT}/X` 형태의 args 접두만 상대화한다. 변수가 args의 다른 위치나 command 및 env에 남으면 `Error`를 throw한다. 모든 생성 서버에는 호스트 마커를 병합하며 Codex는 충돌 없는 서버명과 `cwd: "."`를, agy는 원본 서버명을 유지한다.
- Codex 훅 변환은 지원 이벤트만 남기고 선언된 matcher capability에 따라 exact tool과 PreToolUse fallback을 조정한다. 변환이 필요 없으면 `null`을 반환하며 Claude 정본은 바뀌지 않는다.
- Codex 스킬 변이는 재배치 안전성이 확인된 persona-spawn allowlist 또는 명시적 async lifecycle marker로 opt-in한 플러그인을 대상으로 전체 스킬 집합과 persona를 함께 방출한다. persona registry 스폰에는 self-load 프로토콜을 주입하고, lifecycle marker의 Claude 문단은 explicit Codex spawn/join 문단으로 치환한 뒤 `relativePath` 순으로 정렬한다.
- Async lifecycle marker는 같은 `<plugin>:<agent>`의 `spawn` 다음 `join` 순서로 정확히 한 쌍이어야 하며 plugin 이름과 persona 파일이 facts에 존재해야 한다. 위반은 변환 실패이고 marker가 없는 콘텐츠는 바이트 동일하게 보존한다.
- agy 훅은 PreToolUse 중 bridge 명령으로 실행되는 hook이 남을 때만 플러그인 named-group과 `*` matcher로 변환하며, marketplace 변환은 각 항목의 local source, 설치 정책, Title-case category를 보존한다.

## Acceptance Criteria

### AC-adapters-purity — 순수성과 결정성

- 같은 facts를 두 번 전달하면 깊게 동일하고 안정된 순서의 결과가 나오며 입력 facts는 변경되지 않는다.
- 어떤 공개 빌더도 파일 읽기나 쓰기를 수행하지 않는다.

### AC-adapters-manifest-routing — 매니페스트 라우팅 일치

- 스킬 또는 훅 변이가 방출되는 조건과 매니페스트가 그 변이를 가리키는 조건이 동일하다.
- 선택적 facts가 없으면 해당 매니페스트 필드나 조건부 산출물이 생기지 않는다.

### AC-adapters-mcp-portability — MCP 이식성과 실패

- 단일 및 복수 Codex 서버명이 각각 플러그인명과 `<plugin>-<server>` 규칙을 따르고 모든 Codex 서버에 `cwd: "."`와 `OGHAM_HOST=codex`가 있다.
- agy는 원본 서버명을 보존하고 모든 서버에 `OGHAM_HOST=agy`를 둔다.
- 허용되지 않은 `${CLAUDE_PLUGIN_ROOT}` 위치는 변환 결과를 만들지 않고 `Error`를 throw한다.

### AC-adapters-hook-compatibility — 훅 capability 적용

- Codex 미지원 이벤트와 exact tool은 생성 사본에서 제거되고, 선언된 PreToolUse fallback만 중복 없이 추가된다.
- 원본과 달라질 내용이 없으면 Codex 전용 훅 객체는 `null`이며 Claude 훅 facts는 그대로다.
- agy는 변환 가능한 bridge 명령을 가진 PreToolUse hook이 없으면 객체를 방출하지 않고, 있으면 플러그인 named-group의 `*` matcher로 변환한다.

### AC-adapters-skill-variant — 스킬 변이 완전성

- allowlist·persona·해당 `subagent_type` 스폰 조건을 모두 만족하거나, 유효한 async lifecycle marker가 있을 때만 변이가 방출된다.
- 변이는 전체 스킬 집합과 persona를 포함한다. registry 스폰 콘텐츠만 self-load 주입을 받고 lifecycle marker 콘텐츠만 Codex spawn/join 치환을 받으며 결과는 `relativePath` 순이다.
- lifecycle 생성본은 persona 선행 로드, child target 보관, final 전 `wait_agent` mailbox 대기와 sender 대조, parent 자동 재개 금지를 명시한다. 원본 Claude 문단과 source marker는 생성본에 남지 않는다.
- marker phase·plugin·persona 검증 실패는 fail closed 하며, marker가 없는 비대상 스킬은 바이트 동일하다.

### AC-adapters-marketplace — marketplace 매핑

- 각 marketplace 항목은 local source와 경로, `AVAILABLE` 및 `ON_INSTALL` 정책, Title-case category를 가진다.

## Last Updated

2026-09-04 — 명시적 async lifecycle marker를 Codex spawn/join 문단으로 선택하는 skill variant 계약을 추가했다.
