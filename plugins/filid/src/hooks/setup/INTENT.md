# setup -- SessionStart 초기화

## Purpose

세션 시작 시 4단계 초기화를 수행한다: (1) 캐시 디렉토리 생성 + 로거 경로 설정, (2) `source ∈ {compact, clear}`면 세션 epoch 리셋(`removeSessionFiles` + delivered/turn — 컨텍스트 소실에 맞춰 전달 기록·guide·fmap·포인터 마커를 재무장; `resume`/`startup`은 비대상), (3) INTENT.md 자동 탐지로 `.filid/` 마커 생성, (4) 만료 세션·stale 캐시 정리. `.claude/rules/`는 절대 건드리지 않음 — 규칙 배포는 filid setup 스킬 전담.

## Structure

- `setup.ts` — `processSetup`, `hasIntentMdInTree` (internal)
- `setup.entry.ts` — esbuild 번들 진입점

## Conventions

- Bootstrap 진단은 `selfProbeHook`을 사용해 Node builtin spawn만 번들한다.
- Phase 1 (Init): `getCacheDir(cwd)` → `setLogDir` → `mkdirSync` (없으면)
- Phase 2 (Epoch reset): compact/clear에서만; boundary 캐시 재계산 비용은 수용 (fs 사실이라 정합성 무해)
- Phase 3 (Auto-detect): `!isFcaProject && hasIntentMdInTree(cwd)`면 `.filid/` 생성 후 FCA로 승격
- Phase 4 (Maintenance): `isSessionPruneDue(cwd)` 통과 시 `pruneOldSessions` + `markSessionPruneRun`, `isPruneDue()` 통과 시 `pruneStaleCacheDirs` + `markPruneRun` (독립 게이트)
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

- `.claude/rules/filid_*.md` 등 rule doc 파일을 write
- `.filid/config.json` 자동 생성 (setup 스킬 전담)
- daily throttle 게이트 (`isPruneDue` / `isSessionPruneDue`) 우회로 매 세션마다 prune 강제 실행
- 범용 self-probe·spawn·cross-spawn·which를 SessionStart 번들에 포함

## Dependencies

- 캐시 디렉터리·세션 파일·prune 게이트는 `../../core/infra/cacheManager/` 한 곳에서만 온다.
- 로거·스캔 상수·문서 파일명·훅 타입과 cross-platform 유틸은 상위 계층 공개 경계로만 접근한다.
