# setup -- SessionStart 초기화

## Purpose

세션 시작 시 3단계 초기화를 수행한다: (1) 캐시 디렉토리 생성 + 로거 경로 설정, (2) INTENT.md 자동 탐지로 `.filid/` 마커 생성, (3) 만료 세션·stale 캐시 정리. `.claude/rules/`는 절대 건드리지 않음 — 규칙 배포는 `/filid:filid-setup` 스킬 전담.

## Structure

- `setup.ts` — `processSetup`, `hasIntentMdInTree` (internal)
- `setup.entry.ts` — esbuild 번들 진입점

## Conventions

- Phase 1 (Init): `getCacheDir(cwd)` → `setLogDir` → `mkdirSync` (없으면)
- Phase 2 (Auto-detect): `!isFcaProject && hasIntentMdInTree(cwd)`면 `.filid/` 생성 후 FCA로 승격
- Phase 3 (Maintenance): `pruneOldSessions(cwd)` + `pruneStaleCacheDirs()` 무조건 실행
- `hasIntentMdInTree`: BFS, `maxDepth=4`, `SCAN_SKIP_DIRS` + `.`으로 시작하는 디렉토리 제외
- FCA 프로젝트만 `[filid] Session initialized...` `additionalContext` 주입
- 최상위 try/catch로 모든 예외 포획 → `{ continue: true }` fallthrough

## Boundaries

### Always do

- 로거는 `createLogger('setup')`으로 네임스페이스 고정
- 어떤 실패에도 세션 시작을 블록하지 않음 (`continue: true` 보장)
- `.claude/rules/`는 read-only로만 취급 (deploy 금지)

### Ask first

- `hasIntentMdInTree`의 `maxDepth` 변경 (기본 4)
- Phase 2 자동 감지 조건 수정 (예: `package.json`도 검사)

### Never do

- `.claude/rules/filid_fca-policy.md` 등 rule doc 파일을 write
- `.filid/config.json` 자동 생성 (setup 스킬 전담)
- 매 세션마다 O(projects * files) pruning 없이 throttle 추가 없이 확장

## Dependencies

- `../../core/infra/cache-manager/` (`getCacheDir`, `pruneOldSessions`, `pruneStaleCacheDirs`)
- `../../lib/logger.js` (`createLogger`, `setLogDir`)
- `../../constants/scan-defaults.js` (`SCAN_SKIP_DIRS`)
- `../shared/`, `../../types/hooks.js`
