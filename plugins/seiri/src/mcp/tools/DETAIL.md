# tools — Contract

## Requirements

- 도구는 settings, gates, runtime이다. 코드 읽기·검색·분석은 하니스가 제공한다. runtime의 참여·단계 액션은 명시 요청 검증이며 실제 효과는 짝이 맞는 Post 훅이 적용하고, `dial` 액션은 훅 짝 없이 즉시 밸브에 적용한다.
- 도구 이름의 단일 원천은 `constants/toolNames.ts` 다. 소비처는 full-form `mcp__plugin_seiri_tools__<name>` 으로 참조한다 — short-form 은 서브에이전트에서 해석되지 않는다.
- 도구 설명은 **언제 쓰지 말아야 하는지**까지 적는다(세션 훅 금지, 브라우저가 있으면 `settings` 의 `open` 우선).
- 필드별 `.describe()` 로 비자명한 계약을 붙인다 — 특히 "빠진 id 는 해제로 읽힌다" 같은 것.
- 규칙 파일 쓰기는 사용자의 명시적 확인 뒤에만 일어난다.

## API Contracts

- `settings/` — 브라우저 폼과 bounded long-poll, 헤드리스 폴백(`status`·`manifest`·`plan`·`sync`).
- `gates/` — 작업별 게이트 원장의 상태 조회·포기·수동 증거 기록. 명령을 실행하거나 원장을 생성하지 않는다.
- `runtime/` — `step`·`start`·`resume`·`pause`·`finish`·`dial` 요청을 검증합니다. 필수 절대 project_root와 task를 받고 start/resume에 intent를 요구하고 `step`의 intent는 생략 시 유도하며 native identity는 입력받지 않습니다. off/advisory는 참여 액션에서 disabled이며 상태 적용은 성공한 paired Post의 책임입니다. `dial`(`dial_op`: get/set/clear)은 훅 짝 없이 `.seiri/runtime.json` 밸브에 즉시 적용됩니다.

## Acceptance Criteria

### AC-tool-parity — 두 경로의 동등성

- `settings` 의 `action: 'plan'` 결과가 페이지 미리보기와 같은 계획을 낸다.

### AC-explicit-write-consent — 명시적 확인

- 사용자 확인 없이 규칙 파일이 기록되지 않는다.

### AC-tool-name-source — 이름 단일 원천

- 등록 이름이 `constants/toolNames.ts` 의 값과 일치한다.

## Last Updated

2026-09-26 — 명시적 조건부 참여와 비차단 호스트 계약을 반영했습니다.
