# injectStatic -- SessionStart 정적 정책 주입

## Purpose

세션 시작 시 cennad home 의 `config.json` (`~/.claude/plugins/cennad/` 기본, `CENNAD_CONFIG_PATH` override) 을 읽어 provider 비율·crosscheck 명단(`Active providers`)·자동 라우팅 명단(`Auto-routing`)·강도별 stance·도메인 소유자 표를 `additionalContext` 로 1회 출력한다. active config 를 JSON/object 로 읽을 수 없으면 기본 home 의 config 를 읽기 전용 fallback 으로 시도하고, 실패하면 defaults 로 진행한다 — 세션을 절대 차단하지 않는다.

## Structure

- `injectStatic.ts` — `buildStaticPayload(config, self)` (payload 텍스트 빌더)
- `build/injectStatic.entry.ts` — 번들 진입점 (loadConfig → payload → stdout)
- `utils/strengthLabel.ts` — `intervention_strength → 한 단어 라벨` (UI 슬라이더 어휘)
- `utils/routingStance.ts` — 강도가 실제로 바꾸는 Routing guidance 라인 배열
- `utils/domainLines.ts` — 활성 provider 키워드 → 소유자 표 (+ 제외 사유 접미)
- `utils/joinKeywords.ts` — keywords 트림 + 비었을 때 caller fallback

## Conventions

- `loadConfig` 는 `../shared/loadConfig.js` (LCA shared organ) 에서 import
- payload 라인 순서는 `.metadata/cennad/hooks.md` 와 일치 유지
- `Active providers` = crosscheck 명단(enabled 전부), `Auto-routing` = electable. crosscheck 스킬이 전자를 읽으므로 의미를 바꾸지 않는다
- 표에는 제외된 provider 도 남기고 사유를 붙인다 (self host / by setup)
- 강도의 지시는 stance 가 전담 — 헤더 라벨은 서술하지 않는다 (중복 금지)
- 산문에 `moment` 단어 금지 — 훅 번들 가드가 moment.js 로 오탐한다

## Boundaries

### Always do

- 출력 envelope: `{ continue: true, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } }`
- 어떤 예외에도 `process.exit(0)` 유지
- stance 는 강도와 무관하게 "비율로 위임 금지"·"사용자 지시 우선" 두 줄로 끝난다

### Ask first

- payload 행 순서·헤더 변경 (LLM 컨텍스트 호환성)
- 새 routing guidance 라인 추가 · 강도별 stance 문구 변경
- `+2` 예외 목록 항목 추가/삭제 (닫힌 집합인 것이 이 문구의 요점)

### Never do

- config 파일에 write
- `additionalContext` 에 구체 모델 ID hard-code (alias → ID 매핑은 dispatcher 전담)

## Dependencies

- `../shared/{loadConfig,configTypes,providerOrder,electableProviders,nowIso}.js`
