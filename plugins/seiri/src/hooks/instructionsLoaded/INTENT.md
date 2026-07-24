# instructionsLoaded — 규칙 로드 관측 (dormant)

## Purpose

지시 파일(`CLAUDE.md` · `.claude/rules/*.md`)이 컨텍스트에 로드됐는지를
기록하는 계측기. **주입 0.** 코드의 진실은 저장소가 소유하지만, seiri 가
작동하는지의 진실은 seiri 가 측정한다.

**현재 hooks.json 에 미등록(dormant)** — 빌드되나 상시 세션에서 돌지 않는다.
페이로드 스키마·로드 실측 목적은 달성됐고, 로드 검증은 `/context` 가
대체하며, 로그 소비처가 없어 상시 실행은 순수 부작용이기 때문이다.
재측정하려면 `hooks/hooks.json` 에 `InstructionsLoaded` 블록을 되살린다.
`DORMANT_HOOKS`(constants/hooks.ts)와 wiring 테스트가 이 미등록을 박제한다.

## Structure

- `instructionsLoaded.ts` — `processInstructionsLoaded`
- `utils/appendObservation.ts` — JSONL 추가 + 크기 상한
- `instructionsLoaded.entry.ts` — esbuild 번들 진입점

## Conventions

- **페이로드 전체 저장.** 이벤트별 키가 문서에 없어, 필드를 골라내면
  측정 대상을 버린다. 실사용 세션이 스키마를 드러내게 둔다.
- **matcher 미지원·종료코드 무시.** 로드 사유는 페이로드로 오므로 훅에서 분기.
- 로그는 `pluginCache('seiri')` 경유 — `~/.claude/...` 하드코딩 금지.
- 레코드마다 `cwd`·`session_id` — 한 파일로 프로젝트·워크트리 사후 분리.
- 상한 초과 시 회전 아닌 절단 — "지금 전달되는가"에 최근 구간이면 족하다.

## Boundaries

### Always do

- 실패를 삼킨다 — 관측 부작용이 대상 세션을 방해하지 않는다.
- 출력은 `{ continue: true }` 고정, `hookSpecificOutput` 없음.

### Ask first

- hooks.json 재등록 (상시 컨텍스트·부작용 복귀).
- 레코드 스키마 축소 · 크기 상한 변경.

### Never do

- 컨텍스트 주입 — 관측 전용이다.
- 로그에 규칙 본문이나 사용자 코드 내용 저장.

## Dependencies

- `@ogham/cross-platform/{compat,paths,error-log}`
