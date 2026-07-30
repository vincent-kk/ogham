# instructionsLoaded — Contract

## Requirements

- 지시 파일(`CLAUDE.md`·`.claude/rules/*.md`)이 컨텍스트에 로드됐는지 기록하는 계측기다. **주입은 0이다.**
- 현재 `hooks.json` 에 **미등록(dormant)** 이다. 빌드는 되지만 상시 세션에서 돌지 않는다. 재측정하려면 `hooks/hooks.json` 에 `InstructionsLoaded` 블록을 되살린다. `DORMANT_HOOKS`(`constants/hooks.ts`)와 wiring 테스트가 이 미등록을 박제한다.
- 페이로드를 통째로 저장한다. 이벤트별 키가 문서화되어 있지 않아 필드를 골라내면 측정 대상을 버리게 된다.
- 로그 경로는 `pluginCache('seiri')` 를 거친다 — `~/.claude/...` 를 하드코딩하지 않는다.
- 레코드마다 `cwd` 와 `session_id` 를 남겨, 한 파일에서 프로젝트·워크트리를 사후 분리할 수 있게 한다.
- 크기 상한 초과 시 회전이 아니라 절단한다 — "지금 전달되는가" 에는 최근 구간이면 족하다.
- 실패는 삼킨다. 관측 부작용이 대상 세션을 방해하지 않는다.
- 로그에 규칙 본문이나 사용자 코드 내용을 저장하지 않는다.

## API Contracts

- `processInstructionsLoaded(...)` — 관측 레코드를 append 하고 `{ continue: true }` 를 반환한다. `hookSpecificOutput` 은 없다.
- `utils/appendObservation.ts` — JSONL 추가와 크기 상한 적용.

## Acceptance Criteria

### AC-observation-only — 관측 전용

- 출력에 `hookSpecificOutput` 이 없고 컨텍스트 주입이 0이다.

### AC-dormant-registration — 미등록 상태 고정

- `hooks/hooks.json` 에 `InstructionsLoaded` 블록이 없고, wiring 테스트가 이를 확인한다.

### AC-log-containment — 로그 내용 제한

- 저장된 레코드에 규칙 본문이나 사용자 코드가 없다.
- 상한을 넘으면 절단되고 파일이 무한히 자라지 않는다.

## Last Updated

2026-07-30 — 관측 계측기의 dormant 상태와 로그 계약을 문서화했다.
