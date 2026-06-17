# injectStatic -- SessionStart 정적 정책 주입

## Purpose

세션 시작 시 `~/.claude/plugins/cennad/config.json` 을 읽어 provider 비율·intervention strength·키워드·라우팅 가이드를 `additionalContext` 로 1회 출력한다. config 가 없거나 파싱 실패하면 defaults 로 진행 — 세션을 절대 차단하지 않는다.

## Structure

- `injectStatic.ts` — `buildStaticPayload(config)` (payload 텍스트 빌더)
- `build/injectStatic.entry.ts` — esbuild 번들 진입점 (loadConfig → buildStaticPayload → stdout)
- `utils/tonePhrase.ts` — `intervention_strength → tone string`
- `utils/joinKeywords.ts` — provider keywords 트림 + 비어 있을 때 `(none)`

## Conventions

- `loadConfig` 는 `../shared/loadConfig.js` (LCA shared organ) 에서 import
- payload 라인 순서는 `.metadata/cennad/hooks.md` 와 일치 유지
- legacy 정수 비율은 백분율 + enabled 플래그로 마이그레이션 (read-only)

## Boundaries

### Always do

- 출력 envelope: `{ continue: true, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } }`
- 어떤 예외에도 `process.exit(0)` 유지

### Ask first

- payload 행 순서·헤더 변경 (LLM 컨텍스트 호환성)
- 새 routing guidance 라인 추가

### Never do

- config 파일에 write
- `additionalContext` 에 구체 모델 ID hard-code (alias → ID 매핑은 dispatcher 전담)

## Dependencies

- `../shared/loadConfig.js`, `../shared/configTypes.js`, `../shared/nowIso.js`
