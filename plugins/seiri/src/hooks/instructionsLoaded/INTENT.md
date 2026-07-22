# instructionsLoaded — 규칙 로드 관측

## Purpose

지시 파일(`CLAUDE.md` · `.claude/rules/*.md`)이 컨텍스트에 실제로 로드됐는지를
기록한다. **주입 0.** seiri 가 자기 효능에 대한 오라클을 갖는 유일한 공식
경로다 — 코드의 진실은 저장소가 소유하지만, seiri 가 작동하는지에 대한
진실은 seiri 가 측정해야 한다.

## Structure

- `instructionsLoaded.ts` — `processInstructionsLoaded`
- `utils/appendObservation.ts` — JSONL 추가 + 크기 상한
- `instructionsLoaded.entry.ts` — esbuild 번들 진입점

## Conventions

- **페이로드 전체를 저장한다.** 공식 문서는 이 이벤트의 공통 필드와 로드
  사유는 밝히지만 이벤트별 키는 명시하지 않는다. 지금 필드를 골라내면
  측정하려던 대상을 버리게 되므로, 첫 실사용 세션이 스키마를 드러내게 둔다.
- 이 이벤트는 **matcher 를 지원하지 않고 종료코드가 무시된다.** 로드 사유는
  페이로드로 들어오므로 분기는 훅 안에서 한다.
- 로그 위치는 `pluginCache('seiri')` 경유 — `~/.claude/...` 하드코딩 금지.
- 레코드마다 `cwd` 와 `session_id` 를 담아 한 파일로 프로젝트·워크트리를
  사후 분리한다.
- 상한 초과 시 회전이 아니라 절단 — 이 로그는 "지금 전달되고 있는가"에
  답하므로 최근 구간만 있으면 된다.

## Boundaries

### Always do

- 실패를 삼킨다 — 관측 부작용이 관측 대상 세션을 방해해서는 안 된다.
- 출력은 `{ continue: true }` 고정, `hookSpecificOutput` 없음.

### Ask first

- 레코드 스키마 축소 (필드 선별은 측정 손실).
- 크기 상한 변경.

### Never do

- 컨텍스트 주입 — 이 이벤트는 관측 전용이다.
- 로그에 규칙 본문이나 사용자 코드 내용 저장.

## Dependencies

- `@ogham/cross-platform/{compat,paths,error-log}`
