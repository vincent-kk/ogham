# tools — Contract

## Requirements

- 도구는 둘뿐이며 **상태를 읽고 쓰는 최소**다. 코드에 대해서는 아무것도 하지 않는다 — 읽기·검색·분석은 하니스가 제공한다.
- 도구 이름의 단일 원천은 `constants/toolNames.ts` 다. 소비처는 full-form `mcp__plugin_seiri_tools__<name>` 으로 참조한다 — short-form 은 서브에이전트에서 해석되지 않는다.
- 도구 설명은 **언제 쓰지 말아야 하는지**까지 적는다(세션 훅 금지, 브라우저가 있으면 `open_settings` 우선).
- 필드별 `.describe()` 로 비자명한 계약을 붙인다 — 특히 "빠진 id 는 해제로 읽힌다" 같은 것.
- 규칙 파일 쓰기는 사용자의 명시적 확인 뒤에만 일어난다.

## API Contracts

- `openSettings/` — 브라우저 폼과 bounded long-poll. 대화형 정본이다.
- `ruleDocsSync/` — 같은 일을 하는 헤드리스 폴백(`status`·`manifest`·`plan`·`sync`)과 다이얼 `config` action.

## Acceptance Criteria

### AC-tool-parity — 두 경로의 동등성

- `ruleDocsSync` 의 `plan` 결과가 `openSettings` 미리보기와 같은 계획을 낸다.

### AC-explicit-write-consent — 명시적 확인

- 사용자 확인 없이 규칙 파일이 기록되지 않는다.

### AC-tool-name-source — 이름 단일 원천

- 등록 이름이 `constants/toolNames.ts` 의 값과 일치한다.

## Last Updated

2026-07-30 — 도구 2종의 역할 분담과 이름 계약을 문서화했다.
