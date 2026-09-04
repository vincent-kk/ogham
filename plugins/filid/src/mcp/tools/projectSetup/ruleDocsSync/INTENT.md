# ruleDocsSync -- 규칙 문서 동기화 child

## Purpose

`project_setup`의 rules action을 받아 manifest에 등록된 managed rule 문서를 현재 host의 project rule target에 배포·제거한다. `status`, `manifest`, `sync` 세 child action만 가지며 project source와 config는 수정하지 않는다.

## Structure

- `ruleDocsSync.ts` — `handleRuleDocsSync`의 입력 경계와 action 분기
- `utils/normalizeSelections.ts` · `utils/normalizeResync.ts` — 방어적 입력 정규화 organ
- `utils/validateResyncIds.ts` — manifest 대조 후 미지 id를 skipped로 분리
- `index.ts` — `handleRuleDocsSync`와 입출력 타입만 노출하는 배럴

## Conventions

- 배포 상태의 단일 진실 원천은 host target 파일시스템이다. config에 별도 추적 상태를 두지 않는다.
- `required: true` rule은 선택과 무관하게 배포하고 drift 시 항상 덮어쓴다. optional drift는 `resync`에 id가 명시될 때만 덮어쓰고 아니면 보고만 한다.
- `selections`·`resync`가 문자열화되거나 `null`로 도착하는 호출을 정규화 organ에서 흡수한다.
- plugin root 미해석은 빈 manifest의 성공이 아니라 `pluginRootResolved: false`와 skipped 근거로 구분한다.
- action 판별자와 오류 메시지는 `constants/mcpContracts.ts`의 canonical 값을 쓴다.

## Boundaries

### Always do

- 변경 후 관련 테스트 업데이트
- 필수 규칙(`required: true`)은 사용자 선택과 무관하게 항상 배포

### Ask first

- 공개 API 시그니처 변경
- 신규 액션 추가

### Never do

- SessionStart / UserPromptSubmit 훅에서 호출
- `templates/rules/manifest.json`에 등록되지 않은 파일 복사
- plugin root 미해석을 빈 manifest의 `ok`로 보고

## Dependencies

- `core/infra/configLoader` entry point (`getRuleDocsStatus`, `loadRuleDocsManifest`, `resolvePluginRoot`, `syncRuleDocs`), `constants/mcpContracts.ts`
