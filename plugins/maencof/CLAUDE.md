# CLAUDE.md — @ogham/maencof

현재 계약은 [INTENT.md](./INTENT.md), 소스 경계는 [src/INTENT.md](./src/INTENT.md), 설계 정본은 [Claude-Code-Plugin-Design/INDEX.md](../../.metadata/maencof/Claude-Code-Plugin-Design/INDEX.md)를 따른다.

## Session lifecycle

- Stop·SessionEnd hook을 두지 않는 것이 현재 설계다. MCP shutdown이 현재 세션을 정밀 마감하고, 다음 부팅의 `bootSweep`이 남은 sweep·prune·archive 작업을 완결한다.
- 매 turn의 `session-touch`가 활동 시각과 사용량을 기록하며, 이미 마감된 것으로 판정된 세션에 새 활동이 생기면 다시 연다.
- changelog debt는 다음 SessionStart에 권고만 주며 작업을 차단하지 않는다. `reflect`는 vault 판단 보고서이지 세션 recap이 아니다.

## Prompt-owned behavior

- 대화 규율은 SessionStart가 `metaSkillBody.md`를 주입한다. 전체 주입은 `MAENCOF_DISABLE_DIALOGUE=1`, vault별 주입은 `dialogue-config.json`의 `injection.enabled=false`로 끈다.
- personal context는 SessionStart 주입, `capture_personal_context` upsert, `bootSweep` prune의 한 흐름이다. `personal-context.json::config.enabled=false`가 기능 전체의 off-switch다.
- 자동 호출 trigger와 역할 매핑은 skill 설명과 주입 prompt가 소유한다. 이 문서에 별도 trigger 표를 복제하지 않는다.
