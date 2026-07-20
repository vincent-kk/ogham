# userPromptSubmit -- UserPromptSubmit 훅

## Purpose

사용자 프롬프트 제출 시점에 (1) 턴당 fmap 상태를 초기화하고(서브에이전트 스코프 fmap 포함 prefix 일괄) 세션 턴 카운터를 1 증가시키며(전달 TTL 기준값), (2) 세션 첫 프롬프트에 한 번 FCA-AI 포인터 + 언어 태그 + 비활성 규칙 목록을 주입하고, (3) spike/\* 브랜치에서는 **매 프롬프트** spike 배너(경과일·미수확 결정 수·타임박스·manifest 상태)를 주입한다. 규칙 본문은 복제하지 않고 위치만 가리킨다.

## Structure

- `userPromptSubmit.ts` — `handleUserPromptSubmit` (fmap reset + turn 증가 → inject → spike 배너 머지)
- `userPromptSubmit.entry.ts` — stdin → handler → stdout 파이프
- `utils/injectContext.ts` — 세션 첫 프롬프트 포인터 주입
- `utils/buildMinimalContext.ts` — 포인터·언어 태그·비활성 규칙 조립
- `utils/buildSpikeBanner.ts` — spike 배너 조립 (비-spike면 null)
- `__tests__/` organ — 단위 테스트

## Conventions

- 오케스트레이터가 `validateCwd` + `isFcaProject`를 단 1회 수행; 비-FCA는 즉시 continue
- 3줄 output 규약 (첫 프롬프트만): 포인터 / `[filid:lang]` / (선택) Disabled rules
- `injectContext`의 Gate: `!isFirstInSession && hasPromptContext` → continue
- spike 배너는 **세션 캐시 비대상** — 모드가 세션 중 checkout으로 바뀔 수 있어 매 프롬프트 fresh 판정 (fs 읽기 수 회, git spawn 없음)
- 배너 동적 내용: 경과일(reflog 첫 항목), 미수확 결정 수(reflog 갱신 수), 7일 타임박스 경고, harvest manifest 부재/STALE/EXPIRED/current
- `continue: false` 절대 없음 — 프롬프트 차단 금지

## Boundaries

### Always do

- 규칙 본문을 복제하지 않고 경로만 포인터로 제공
- fmap reset은 FCA 프로젝트에서만 수행
- `.claude/rules/`에는 절대 write 금지 (`setup` 스킬 전담)

### Ask first

- fmap·turn 외 추가 상태 리셋/증가 (boundary·delivered 캐시 등 — delivered는 setup의 epoch 리셋 전담)
- 포인터·spike 배너 이외 추가 컨텍스트 라인
- 포인터 주입 Gate 완화 (spike 배너 외의 매 프롬프트 주입)

### Never do

- `.claude/rules/filid_fca-policy.md`에 파일 write
- `continue: false` 반환
- spike 배너를 세션 캐시에 태우기 (모드 전이 brain-split 유발)
- 훅 번들에 zod import (번들 크기 예산 초과 — `readHookConfig` 패턴 사용)

## Dependencies

- `../../core/infra/cacheManager/`, `../../constants/spikeMode.js`
- `../shared/`, `../utils/` (`validateCwd`, `readHookConfig`, git 메타 판독기, `readHarvestManifest`)
