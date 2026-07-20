# TODO — 훅/MCP 플러그인 상태 경로(plugin-data path) 면밀 검토

> **2026-07-21 착수 · 다음 세션 이어서.** 배경 원장: [README.md](./README.md) §현재 상태·남은 작업 · 호스트 env 사실은 [host-capability-matrix.md](./host-capability-matrix.md).
> 이 문서는 세션-복원 덤프가 아니라 **이 단일 이슈**(훅/MCP 상태 디렉터리 호스트 정합성)의 열린 질문 추적기다.

## 이미 한 것 — 훅 상태 `~/.claude` 누수 1차 봉합 (재작업 금지)

이 브랜치 워킹트리(미커밋)에서 완료·검증됨:

- `shared/cross-platform/src/paths/paths.ts` `stateRoot()` — `OGHAM_HOST==="codex" || process.env.PLUGIN_DATA` → `CODEX_HOME ?? ~/.codex`. **훅은 `OGHAM_HOST` 를 못 받지만 Codex 가 훅 프로세스에 주입하는 `PLUGIN_DATA` 로 감지**(소스 `hooks/engine/discovery.rs` "OOTB compat", ponytail 실증).
- `shared/cross-platform/src/hooks/errorLog.ts` — `~/.claude` 하드코딩 → `pluginCache(pkg)` 경유 (INTENT.md 가 이미 명시하던 `../paths` 의존 복원).
- `plugins/imbas/src/hooks/setup/setup.ts` — `CLAUDE_CONFIG_DIR||~/.claude` 하드코딩 → `pluginCache('imbas')` 경유.
- fail-first 테스트: paths 2건 + errorLog 1건 (pre-fix RED → post-fix GREEN 확인). typecheck 클린, 전체 **4465 통과**, 훅 번들 바이트캡·금지모듈 가드 통과(env-paths tree-shake 확인).

## 열린 질문 (면밀 검토 대상)

### Q1. Claude 는 정말 `PLUGIN_DATA` 를 안 주는가? — **직접 실측 필요 (최우선)**

판별자 `Boolean(process.env.PLUGIN_DATA) === Codex` 의 안전성은 **Claude 가 un-prefixed `PLUGIN_DATA` 를 미설정**한다는 전제에 선다.

- **정황 근거**: ponytail-runtime.js `isCodex = !isCopilot && Boolean(PLUGIN_DATA)` (프로덕션 다중호스트 — Claude 를 Codex 로 오판 안 함) · matrix (Claude native = `CLAUDE_`-prefixed, un-prefixed 는 Codex compat).
- **미검증**: 이 세션에서 Claude Code 훅의 실제 env 를 **직접 안 쟀다**. 훅에 env 덤프 프로브를 걸어 Claude 가 `PLUGIN_DATA` 를 설정하는지 확정할 것.
- **리스크**: 만약 Claude 도 `PLUGIN_DATA` 를 준다면 → **Claude 상태가 `~/.codex` 로 오라우팅**(Claude 무결손 위반). 그 경우 대체 discriminator 필요(예: Codex 전용 다른 마커, 혹은 `PLUGIN_DATA` 값의 경로 패턴 검사).

### Q2. MCP vs 훅 경로 정합성 + Codex 정식 데이터 디렉터리 사용 여부

- 현재: Codex 에서 MCP(`OGHAM_HOST`)·훅(`PLUGIN_DATA`) 둘 다 `CODEX_HOME/plugins/<pkg>` 로 수렴 → **정합**(의도).
- 그러나 Codex 가 훅에 주는 `PLUGIN_DATA` **값**은 Codex 관리 per-plugin dir(예: `~/.codex/plugins/data/<mp>-<pkg>`)이고 우리 `~/.codex/plugins/<pkg>` 와 **다르다**. MCP 엔 `PLUGIN_DATA` 가 안 와서 값을 직접 못 쓴다.
- **결정 필요**: (a) 현행 — 우리 컨벤션 유지(MCP/훅 정합, 단 Codex uninstall 시 미정리). (b) 훅은 `PLUGIN_DATA` 값 직접 사용(Codex-native·자동정리, 단 MCP 와 경로 분기 → 같은 플러그인이 MCP·훅에서 상태 공유 시 깨짐). → **플러그인별 "MCP·훅이 같은 상태 파일 공유하나" 감사 후 결정.**

### Q3. 남은 하드코딩 힌트 문자열 (cosmetic, 내 수정이 초래한 불일치)

훅 부트스트랩 실패 메시지 4곳이 아직 `~/.claude/plugins/<pkg>/error-log.json` 하드코딩 → Codex 에선 오안내:

- `plugins/imbas/src/hooks/setup/setup.entry.ts:35` (+ `:14` 주석)
- `plugins/filid/src/hooks/setup/setup.entry.ts:35`
- `plugins/maencof-lens/src/hooks/sessionStart/sessionStart.entry.ts:29`
- `plugins/maencof/src/hooks/sessionStart/helpers/probeAdvisory/probeAdvisory.ts:28`

→ `errorLog` 에 `errorLogPath(pkg)` export 후 실제 경로 보간(또는 호스트 중립 문구). 이번 세션에 export 착수→범위 보류로 되돌림.

### Q4. 전 플러그인 상태-경로 전수 감사

- C4-3 이 통합했다는 **deilen·r-statistics** 로컬 `claudeRoot()` 가 실제 `pluginCache` 경유하는지 재확인.
- 훅 도달 코드에 `homedir()+.claude` / `CLAUDE_CONFIG_DIR` 잔존 하드코딩 재스윕. (이번엔 errorLog·imbas setup 만 발견. `maencof graphCache.ts:19` 의 `~/.claude` 는 **BLOCKED_PREFIXES 보안**이라 정상·제외.)

### Q5. agy 훅 상태 채널

- agy 러너 훅은 `PLUGIN_DATA`(Codex 전용)를 못 받는다 → 현재 claude 채널(conservative). agy 가 훅에 주는 고유 상태 신호가 있는지, 별도 처리 필요한지 미검토.

### Q6. 판별자 robustness

- Copilot=`COPILOT_PLUGIN_DATA`(별개)→무영향. 그 외 `PLUGIN_DATA` 를 세팅하는 무관 환경의 false-positive 여지 점검.

## 참조

- 판별 근거·소스는 `stateRoot()` 주석(`paths.ts`)에 인라인.
- 호스트 훅 env 실측: matrix (Codex `discovery.rs` OOTB compat) · ponytail `hooks/ponytail-runtime.js` (`~/.codex/plugins/cache/ponytail/ponytail/<ver>/`).
