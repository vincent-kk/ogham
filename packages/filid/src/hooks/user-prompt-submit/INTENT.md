# user-prompt-submit -- UserPromptSubmit 훅

## Purpose

사용자 프롬프트 제출 시점에 (1) 턴당 fmap 상태를 초기화해 다음 PreToolUse에서 INTENT.md가 재주입되도록 하고, (2) 세션 첫 프롬프트에 한 번 FCA-AI 포인터(`.claude/rules/filid_fca-policy.md`) + 언어 태그 + 비활성화 규칙 목록을 주입한다. 규칙 본문은 Claude Code가 프로젝트 지시사항으로 자동 로드하므로 훅은 위치만 가리키고 본문은 복제하지 않는다.

## Structure

- `user-prompt-submit.ts` — `handleUserPromptSubmit` (오케스트레이터: fmap reset → inject)
- `user-prompt-submit.entry.ts` — stdin → handler → stdout 파이프
- `inject-context.ts` — `injectContext`, `buildMinimalContext`
- `__tests__/` organ — 단위 테스트

## Conventions

- 오케스트레이터가 `validateCwd` + `isFcaProject`를 단 1회 수행; 비-FCA는 즉시 continue
- 3줄 output 규약 (첫 프롬프트만):
  1. 포인터: `FCA-AI active` / `Not initialized` / `Rules not deployed` 중 하나
  2. `[filid:lang] <lang>` (resolveLanguage 항상 성공)
  3. (선택) `[filid] Disabled rules: ...`
- `injectContext`의 Gate: `!isFirstInSession && hasPromptContext` → continue
- 주입 후 `writePromptContext` + `markSessionInjected` 두 캐시 마킹
- `continue: false` 절대 없음 — 프롬프트 차단 금지

## Boundaries

### Always do

- 규칙 본문을 복제하지 않고 경로만 포인터로 제공
- fmap reset은 FCA 프로젝트에서만 수행
- `.claude/rules/`에는 절대 write 금지 (`filid-setup` 스킬 전담)

### Ask first

- fmap 외 추가 상태 리셋 (boundary 캐시 등)
- 포인터 이외 추가 컨텍스트 라인
- Gate 완화 (매 프롬프트 주입 등)

### Never do

- `.claude/rules/filid_fca-policy.md`에 파일 write
- `continue: false` 반환
- `inject-context` 로직을 오케스트레이터에 인라인 복제

## Dependencies

- `../../core/infra/cache-manager/` (`hasPromptContext`, `isFirstInSession`, `markSessionInjected`, `removeFractalMap`, `writePromptContext`)
- `../../core/infra/config-loader/` (`loadConfig`, `resolveLanguage`)
- `../../core/rules/rule-engine/` (`loadBuiltinRules`)
- `../shared/`, `../utils/validate-cwd.js`
