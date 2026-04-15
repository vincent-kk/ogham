# context-injector -- UserPromptSubmit FCA 포인터 주입

## Purpose

세션의 첫 프롬프트에 한 번 FCA-AI 포인터(`.claude/rules/filid_fca-policy.md`) + 언어 태그 + 비활성화 규칙 목록을 주입한다. 규칙 본문은 Claude Code가 프로젝트 지시사항으로 자동 로드하므로 훅은 위치만 가리키고 본문은 복제하지 않는다.

## Structure

- `context-injector.ts` — `injectContext`, `buildMinimalContext`
- `__tests__/` organ — 단위 테스트

## Conventions

- 3줄 output 규약 (첫 프롬프트만):
  1. 포인터 라인: 초기화 상태에 따라 3가지 중 하나 (`FCA-AI active` / `Not initialized` / `Rules not deployed`)
  2. `[filid:lang] <lang>` 단 하나 (resolveLanguage 항상 성공)
  3. (선택) `[filid] Disabled rules: ...` — override로 꺼진 내장 규칙 ID 목록
- Gate 1: `!isFcaProject(cwd)` → continue
- Gate 2: `!isFirstInSession && hasPromptContext` → continue (이미 주입됨)
- 주입 후 `writePromptContext` + `markSessionInjected` 두 캐시 마킹
- `continue: false` 절대 없음 — 프롬프트 차단 금지

## Boundaries

### Always do

- 규칙 본문을 복제하지 않고 경로만 포인터로 제공
- 세션 훅은 `.claude/rules/`에 절대 write 금지 (`filid-setup` 스킬만 가능)

### Ask first

- 포인터 이외 추가 컨텍스트 라인 추가
- Gate 조건 완화 (매 프롬프트 주입 등)

### Never do

- `.claude/rules/filid_fca-policy.md`에 파일 write
- `continue: false` 반환

## Dependencies

- `../../core/infra/cache-manager/` (`hasPromptContext`, `isFirstInSession`, `markSessionInjected`, `writePromptContext`)
- `../../core/infra/config-loader/` (`loadConfig`, `resolveLanguage`)
- `../../core/rules/rule-engine/` (`loadBuiltinRules`)
- `../shared/` (`isFcaProject`), `../utils/validate-cwd.js`
