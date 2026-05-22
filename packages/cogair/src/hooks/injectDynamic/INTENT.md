# injectDynamic -- UserPromptSubmit 라이브 상태 주입

## Purpose

매 사용자 프롬프트마다 `runtime/counter.json` + `config.json` 을 읽어 호출 카운트·현재 비율·목표 비율·drift 를 `additionalContext` 로 출력한다. counter 가 없거나 `parent_pid` 가 현재 세션과 다르면 0/0 으로 표시. counter 파일은 read-only — 리셋은 counterManager 책임.

## Structure

- `injectDynamic.ts` — `buildDynamicPayload(config, counter)`
- `build/injectDynamic.entry.ts` — esbuild 번들 진입점
- `utils/loadCounter.ts` — fs read + parent-pid 비교
- `utils/asNonNegInt.ts` — counter 필드 정수 가드
- `utils/formatRatio.ts` — current/target/drift 텍스트 라인 빌더
- `utils/signed.ts` — drift 부호 포매팅 (`+N` / `-N`)

## Conventions

- 호출 0건이면 `No calls this session yet.` 한 줄만 (current/target/drift 생략)
- `ratio.gemini.enabled` 와 `ratio.codex.enabled` 가 둘 다 false → 마지막 줄에 `Available providers: none — run /setup`
- 목표 비율은 disabled 일 때 0% 로 표시 (drift 계산도 0 기준)
- 반올림은 `Math.round`. current/target/drift 모두 정수 퍼센트

## Boundaries

### Always do

- 출력 envelope: `{ continue: true, hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext } }`
- counter 파일은 read-only

### Ask first

- counter 스키마 확장
- formatRatio 의 반올림 정책 변경

### Never do

- counter / config 파일에 write
- `additionalContext` 에 cwd / session ID 누설
- parent-pid 미스매치 시 직접 리셋

## Dependencies

- `../shared/loadConfig.js`, `../shared/configTypes.js`, `../shared/paths.js`, `../shared/safeReadJson.js`, `../shared/nowIso.js`
