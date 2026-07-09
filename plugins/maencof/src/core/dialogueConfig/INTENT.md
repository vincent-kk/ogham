# dialogueConfig

## Purpose

대화 규율(meta-skill 주입) 설정 로더. `.maencof-meta/dialogue-config.json` 의 injection.enabled 를 안전 파싱으로 읽고, env `MAENCOF_DISABLE_DIALOGUE` 우선 OR 결합으로 off-switch 판정.

## Structure

- `index.ts` — barrel (공개 API: readDialogueConfig/writeDialogueConfig/isDialogueInjectionDisabled)
- `operations/` organ — 설정 IO·판정 (dialogueConfigPath 사설 헬퍼 + read/write/isDialogueInjectionDisabled, 함수 1개/파일)

## Boundaries

### Always do

- 수동 가드(dialogueConfigGuard)로 설정 파싱 + 실패 시 DEFAULT_DIALOGUE_CONFIG fallback
- env `MAENCOF_DISABLE_DIALOGUE === "1"` 을 config 보다 우선 평가
- 기존 설정 파일의 알 수 없는 키(retired `session_recap` 등)는 정규화에서 무시

### Ask first

- env 변수 이름 변경
- 새 dialogue 축 추가 시 schema 확장 범위

### Never do

- mcp/ 또는 hooks/ 직접 의존
- meta-skill 내용 자체를 알거나 가공 (호출자가 SKILL.md 를 직접 다룬다)
- DEFAULT_DIALOGUE_CONFIG 값을 런타임에 변경
- Zod 스키마(dialogueConfig.ts)와 수동 가드(dialogueConfigGuard.ts) 간 필드 불일치 허용 금지 — 스키마 수정 시 대응 가드도 같은 PR에서 동기화
