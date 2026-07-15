## Purpose

agy 훅 **런타임 어댑터**. 순수 번역(`agyHooks`)을 감싸 실제 I/O 를 수행한다 — agy stdin 판독, Claude 핸들러 번들 스폰(번역된 페이로드 주입), 응답 역변환, SessionStart once-guard. 각 플러그인의 `bridge/run-agy.mjs` 로 번들되어 emit 된 agy `hooks.json` 이 이 러너를 경유한다. **Claude/Codex 경로는 이 파일에 닿지 않는다.**

## Structure

| File             | Role                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| `index.ts`       | barrel (테스트·API 표면)                                                  |
| `runAgyHook.ts`  | 순수 오케스트레이션 — I/O 주입받아 매핑·once-guard 결정 (테스트 가능)      |
| `sessionOnce.ts` | conversationId+target 별 SessionStart 1회 가드 (O_EXCL 마커)              |
| `main.ts`        | CLI 진입 — stdin 판독 + 핸들러 spawn 배선 (`bridge/run-agy.mjs` 로 번들)   |

## Conventions

- 모든 조기 반환은 **빈 `injectSteps` no-op** — 훅이 agy 루프를 막지 않는다.
- 부수효과(stdin·마커·spawn)는 `runAgyHook` 에 주입 → 라이브 agy 없이 단위 테스트.
- 스폰되는 핸들러엔 `CLAUDE_PLUGIN_ROOT = cwd`(agy 에선 플러그인 루트) 를 넘긴다.
- argv: `<ClaudeEvent> <handler.mjs 경로>`.

## Boundaries

### Always do

- 실패(핸들러 null·파싱 오류·예외)는 no-op 로 흡수 — 절대 block 금지.
- SessionStart 는 conversationId 별 1회만 발화.

### Ask first

- 마커 저장 위치 변경(현재 OS temp).
- PreToolUse/PostToolUse 배선 추가 (agyHooks 확장 선행).

### Never do

- Claude/Codex 훅 경로에서 이 모듈 소비.
- 번역 규칙을 여기 인라인 (그건 `agyHooks` 소유).

## Dependencies

- 내부: `../agyHooks` (순수 번역).
- 외부: Node 내장 (`node:child_process`·`node:fs`·`node:crypto`·`node:os`·`node:path`) 만.
