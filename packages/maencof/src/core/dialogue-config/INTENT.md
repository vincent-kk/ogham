# dialogue-config

## Purpose

대화 규율(meta-skill 주입 + 세션 회고) 설정 로더. `.maencof-meta/dialogue-config.json` 의 injection.enabled / session_recap.enabled 를 안전 파싱으로 읽고, env `MAENCOF_DISABLE_DIALOGUE` 우선 OR 결합으로 off-switch 판정.

## Structure

- `dialogue-config.ts` — readDialogueConfig, writeDialogueConfig, isDialogueInjectionDisabled, isSessionRecapDisabled
- `index.ts` — barrel export

## Boundaries

### Always do

- DialogueConfigSchema(Zod)로 설정 파싱 + safeParse 실패 시 DEFAULT_DIALOGUE_CONFIG fallback
- env `MAENCOF_DISABLE_DIALOGUE === "1"` 을 config 보다 우선 평가
- injection 과 session_recap 두 축을 독립적으로 노출 (env override 는 injection 만 적용)

### Ask first

- env 변수 이름 변경
- 새 dialogue 축 추가 시 schema 확장 범위

### Never do

- mcp/ 또는 hooks/ 직접 의존
- meta-skill 내용 자체를 알거나 가공 (호출자가 SKILL.md 를 직접 다룬다)
- DEFAULT_DIALOGUE_CONFIG 값을 런타임에 변경
