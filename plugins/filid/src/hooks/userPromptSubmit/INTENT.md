# userPromptSubmit -- UserPromptSubmit 훅

## Purpose

사용자 프롬프트마다 turn-scoped fmap을 초기화하고 전달 TTL turn을 증가시킨 뒤, 세션 첫 프롬프트에만 FCA-AI 포인터·언어 태그·비활성 규칙 목록을 주입한다.

## Structure

- `userPromptSubmit.ts` — `handleUserPromptSubmit` (fmap reset + turn 증가 → session-first inject)
- `userPromptSubmit.entry.ts` — stdin → handler → stdout 파이프
- `utils/injectContext.ts` — 세션 첫 프롬프트 포인터 주입
- `utils/buildMinimalContext.ts` — host target 포인터·언어 태그·비활성 규칙 조립
- `__tests__/` organ — 단위 테스트
- `DETAIL.md` — 공개 prompt lifecycle 계약

## Conventions

- 오케스트레이터가 `validateCwd` + `isFcaProject`를 단 1회 수행; 비-FCA는 즉시 continue
- 3줄 output 규약 (첫 프롬프트만): 포인터 / `[filid:lang]` / (선택) Disabled rules
- `injectContext`의 Gate: `!isFirstInSession && hasPromptContext` → continue
- branch·spike·harvest 상태는 prompt context 입력이 아님

## Boundaries

### Always do

- 규칙 본문을 복제하지 않고 경로만 포인터로 제공
- fmap reset은 FCA 프로젝트에서만 수행
- host rule target에는 절대 write 금지 (`setup` 스킬 전담)

### Ask first

- fmap·turn 외 추가 상태 리셋/증가 (boundary·delivered 캐시 등 — delivered는 setup의 epoch 리셋 전담)
- 포인터 이외 추가 컨텍스트 라인
- 포인터 주입 Gate 완화 또는 매 프롬프트 재주입

### Never do

- 검사한 host rule target에 파일 write
- `continue: false` 반환
- branch·spike·harvest 배너 주입
- 훅 번들에 zod import (번들 크기 예산 초과 — `readHookConfig` 패턴 사용)
- 번들 metafile에 범용 manager·planning·apply·transaction graph 포함

## Dependencies

- `@ogham/agent-artifacts/rules/presence/trusted`, `@ogham/agent-artifacts/targets/project/rules`
- `../../core/infra/cacheManager/`
- `../shared/`, `../utils/validateCwd.js`
