---
created: 2026-07-12
updated: 2026-07-12
tags: [handoff, session-finalizer, mcp-lifecycle, plugin-compiler, shared-runtime]
layer: handoff
status: in-progress
---

# 핸드오프 — `@ogham/session-finalizer` 런타임 + plugin-compiler 정착 (Phase 1-4)

> **목적**: detached finalizer(비동기 세션종료 완결)를 **재사용 공유 런타임으로 추출**해 "비동기 세션종료 작업의 기본 구현"으로 만들고, plugin-compiler에 정착시키며, maencof·filid·imbas 3플러그인을 이 런타임으로 이관한다.
> **상태**: Phase 0(레퍼런스 구현, maencof) **완료·커밋됨**. Phase 1-4 **미착수**. 이 문서만으로 재발견 없이 이어갈 수 있게 기록.
> **승인 범위**: 사용자가 **Phase 1-4 전부** 선택.
> 관련: [ADR sessionend-refactor.md](./sessionend-refactor.md) (option 3 = `@ogham/session-finalizer`) · [TODO.md](./TODO.md) · [maencof 설계 28](../maencof/Claude-Code-Plugin-Design/28-session-finalizer.md)

---

## 0. 이미 완료된 것 (이 세션, 커밋됨)

브랜치 `pre-ref/issue-78` (base `feture/issue-78`, PR **#85**). origin보다 **ahead 10** (미푸시 — 내 커밋 + 사용자 filid 커밋 교차). 워킹트리 클린.

- **`e14164f7` feat(cross-platform): add spawnDetached** — `shared/cross-platform/src/spawn/spawnDetached.ts` (fire-and-forget detached, cross-spawn, no-throw) + 배럴 `spawn/index.ts` + `spawn/INTENT.md` + `spawn/__tests__/spawnDetached.test.ts`(3케이스). **cross-platform `dist/`는 로컬 재빌드됨(미추적/미커밋)**.
- **`f17e6622` feat(maencof): spawn detached session finalizer at shutdown** — 레퍼런스 구현:
  - `plugins/maencof/src/mcp/serverEntry/serverEntry.ts` — `--finalize <vaultPath>` 분기(bootSweep 1회 후 exit, server 미기동).
  - `plugins/maencof/src/mcp/server/lifecycle/operations/registerShutdown.ts` — 동기 precise-close + SIGINT/SIGTERM 시 `spawnDetached(process.execPath, [process.argv[1], '--finalize', vaultPath])`.
  - `lifecycle/INTENT.md`, `__tests__/unit/mcpLifecycle.test.ts`(finalizer 검증 + spawnDetached mock), 설계문서 28(status: implemented).
- 검증됨: maencof typecheck 0 · 전체 스위트 1218 pass · build:plugin 가드 통과 · 스모크 `node bridge/mcp-server.cjs --finalize <non-vault>` → exit 0(서버 미기동).
- **maencof 구현이 곧 추출 대상**. Phase 1은 이 로직을 shared 런타임으로 일반화.

> ⚠️ 이 세션의 다른 커밋들(파이프라인/advisory)은 이미 머지된 별개 작업: `67de998d`(FIX-001..005 resolve), `64918397`(배럴), `9947b337`(lifecycle operations/ 분해), `7e16ff5d`(recordSessionEnd 제거), `3e70a4ca`(설계문서 28). 사용자 filid 커밋(`bd4ff5ee`·`b4e9302e`·`dec52bcd`·`69cccd91`·`b26bf2aa`·`404c1248` = threePlusTwelve→testCaseGate)과 교차. **내 커밋엔 filid/bridge 파일 0건**(검증 완료).

---

## 1. 설계 — `@ogham/session-finalizer` 공유 런타임 API

ADR option 3의 런타임. maencof 레퍼런스를 일반화. **양쪽 지원**: Type C(동기 cleanup만, filid/imbas)와 Type P(동기 + detached 비동기 완결, maencof).

```ts
// shared/session-finalizer  (exports './' 단일 배럴)

export interface ShutdownFinalizerOptions {
  /** finalizer 자식·onShutdown에 넘길 컨텍스트 문자열 (vault/project 경로 등). */
  ctx: string;
  /** 게이트 — true일 때만 동작 (예: isMaencofVault). */
  guard?: (ctx: string) => boolean;
  /** 동기·in-grace cleanup (turn-context 폐기·정밀 마감·캐시삭제). async/git 금지. */
  onShutdown?: (ctx: string) => void;
  /** true면 SIGINT/SIGTERM에서 detached `node <process.argv[1]> <flag> <ctx>` 스폰
   *  → 무거운 비동기 완결을 grace 밖에서. (엔트리가 runFinalizer로 <flag> 처리해야 함) */
  detached?: boolean;
  /** finalize 플래그 (기본 '--finalize'). */
  flag?: string;
}

/** exit/SIGINT/SIGTERM 핸들러 1회 등록.
 *  - 'exit' → onShutdown만 (동기).
 *  - SIGINT/SIGTERM → onShutdown → (detached면) spawnDetached → process.exit(0). */
export function registerShutdownFinalizer(opts: ShutdownFinalizerOptions): void;

/** 서버 엔트리 디스패치: argv에 `<flag> <ctx>`가 있으면 task(ctx) 1회 실행 후 exit(0),
 *  true 반환(호출자는 서버를 기동하면 안 됨). 없으면 false. */
export function runFinalizer(
  argv: string[],
  task: (ctx: string) => void | Promise<void>,
  flag?: string, // 기본 '--finalize'
): boolean;
```

**maencof 이관 예시(목표 형태):**
```ts
// serverEntry.ts
if (runFinalizer(process.argv, (ctx) => bootSweep(ctx))) {/* handled, 서버 미기동 */}
else { /* companion 마이그레이션 + startServer() */ }

// registerShutdown 자리 (startServer가 호출)
registerShutdownFinalizer({
  ctx: vaultPath,
  guard: isMaencofVault,
  onShutdown: (v) => { removeTurnContext(v); /* env session_id 정밀 마감·digest·캐시삭제 */ },
  detached: true,
});
```
**filid/imbas**: `detached` 생략(또는 false) → 동기 cleanup만, 스폰 없음. (filid: onShutdown=cleanupOwnSessionCache; imbas: 세션종료 작업 없음 → 아래 §5 판단.)

**의존**: `@ogham/cross-platform/spawn`의 `spawnDetached`. (spawn 로직 재구현 금지 — plugins/\*는 child_process 직접 금지, cross-platform 경유.)
**저널/recap 지연완결(ADR option 3의 event-source 저널)은 이 핸드오프 범위 밖** — "이 방식"(spawn+boot-sweep 폴백)만 일반화. 저널은 후속.

---

## 2. Phase 1 — `shared/session-finalizer` 신설

**워크스페이스**: 루트 `package.json` `workspaces` = `["mcp-servers/*","plugins/*","shared/*","tools/*"]` → `shared/session-finalizer`는 자동 포함. `yarn workspace @ogham/session-finalizer <script>`.

**템플릿**: `shared/cross-platform` 구조 복제.
- `package.json`: name `@ogham/session-finalizer`, `private:true`, `type:"module"`, `sideEffects:false`, `exports: { ".": { types:"./dist/index.d.ts", import:"./dist/index.js" } }`, `main`/`types` → dist, scripts `build`(=`yarn clean && tsc -p tsconfig.build.json`)·`clean`·`typecheck`·`test`·`test:run`·`format`, devDeps: `@types/node ^20`, `typescript ^5.7`, `vitest ^4.1.10`. dependencies: `@ogham/cross-platform`(`workspace:^`). (spawn 타입 위해.)
- `tsconfig.json`: `extends ../../tsconfig.base.json`, `outDir ./dist`, `rootDir ./src`, `types:["node"]`, `exclude:[...,"src/**/__tests__/**"]`.
- `tsconfig.build.json`: extends tsconfig.json, `noEmit:false`, `declaration:true`, `declarationMap:true`.
- `vitest.config.ts`: include `src/**/__tests__/**/*.test.ts`, globals true.
- `src/`: **fractal 1함수/파일** — `registerShutdownFinalizer.ts` + `runFinalizer.ts` + `index.ts`(배럴) + `INTENT.md`(≤50줄, 3-tier) + `DETAIL.md`(API 계약). 테스트 `src/__tests__/*.test.ts`.
  - `registerShutdownFinalizer.ts`: maencof `registerShutdown.ts`의 등록 구조(once 가드, `SHUTDOWN_SIGNALS`, exit→onShutdown, signal→onShutdown+spawnFinalizer+exit) 일반화. spawnFinalizer는 `guard` 통과 시 `spawnDetached(process.execPath, [process.argv[1], flag, ctx])`.
  - `runFinalizer.ts`: `serverEntry.ts`의 `--finalize` 분기 일반화 (`argv.indexOf(flag)` → `task(ctx)` → `.finally(()=>process.exit(0))`, return true).
- **빌드**: `yarn workspace @ogham/session-finalizer build` → dist 생성(로컬, **미커밋** — cross-platform처럼 dist 미추적). 소비처(maencof 등)가 dist로 해석하므로 재빌드 필수.
- **테스트**: registerShutdownFinalizer(리스너 1회 등록·onShutdown 호출·detached면 spawn mock 호출·exit(0)), runFinalizer(플래그 매치 시 task+exit true / 미매치 false). spawnDetached mock(`vi.mock('@ogham/cross-platform/spawn', ...)`), process.exit spy — maencof mcpLifecycle.test.ts 패턴 참고.

---

## 3. Phase 2 — maencof 이관

- `serverEntry.ts`: 직접 `--finalize` 분기 제거 → `runFinalizer(process.argv, (ctx)=>bootSweep(ctx))`. bootSweep import는 lifecycle 배럴 경유 유지.
- `registerShutdown.ts`: 수제 spawn/등록 제거 → `registerShutdownFinalizer({ ctx: vaultPath, guard: isMaencofVault, onShutdown: <현재 shutdown() 동기 본문>, detached: true })`. (현재 onShutdown 본문 = removeTurnContext + `if(CLAUDE_CODE_SESSION_ID){ sweepStaleSessions(0,id)+digest+removeSessionFiles }` + catch appendErrorLogSafe.) registerShutdown 파일은 얇은 래퍼로 축소(또는 startServer에서 직접 호출). **lifecycle이 operations/로 분해돼 있음**(index.ts 배럴 + operations/{bootSweep,registerShutdown}.ts) — 구조 유지.
- `bootSweep`(async task)·boot 폴백(server.ts가 boot 시 호출)·lifecycle/INTENT.md·설계문서 28은 **유지**(문구만 "shared 런타임 소비"로 갱신).
- maencof `package.json`에 `@ogham/session-finalizer`(`workspace:^`) 의존 추가.
- 테스트: `mcpLifecycle.test.ts` — registerShutdownFinalizer가 shared라 mock 대상 변경. (spawnDetached mock은 그대로, registerShutdownFinalizer를 실제 호출하거나 mock.)
- 검증: maencof typecheck + 전체 스위트 + `build:plugin`(가드) → **bridge 재빌드는 복원(미커밋)**. 스모크 `--finalize` 재확인.

---

## 4. Phase 3 — plugin-compiler 정착

- **기본 fallback 변경(핵심 1줄)**: `tools/plugin-compiler/src/ir/load/parseHooks.ts:8` — `SessionEnd: "stale-sweep"` → `SessionEnd: "mcp-lifecycle"`. 이러면 plugin.yaml override 없는 모든 플러그인이 "서버가 세션종료 소유, 훅 미방출"이 **기본**. (opt-out은 `hookOverrides` 경로 `parseHooks.ts:42`로 이미 가능.)
  - ⚠️ `stale-sweep` fallback이 다른 곳(emit/lint)에서 참조되면 처리 필요 — `grep -rn "stale-sweep" tools/plugin-compiler/src`로 소비처 전수 확인 후 변경. `HookFallback` 유니언(`src/types/ir.ts:29-34`)에서 `stale-sweep` 정의/의미도 점검.
- **문서 갱신** (컴파일러는 선언적이라 코드젠 아님 — 런타임은 `@ogham/session-finalizer`가 소유, 컴파일러는 mcp-lifecycle로 훅만 억제):
  - `.metadata/plugin-compiler/usage.md` §5 (fallback 표 `usage.md:80-92`) — `mcp-lifecycle`의 정본 런타임이 `@ogham/session-finalizer`(detached finalizer)임을 명시.
  - `.metadata/plugin-compiler/sessionend-refactor.md` — option 3 "미구현" → **구현됨(`@ogham/session-finalizer`)**으로 상태 갱신(§4 옵션3·§7 런타임·TODO 링크).
  - `.metadata/plugin-compiler/TODO.md` §3-4 — mcp-lifecycle 런타임(session-finalizer + boot-sweep) 구현 반영.
- **IR 스키마 인코딩은 "Ask first"**: `tools/plugin-compiler/INTENT.md:34` "정본 IR 스키마 변경"은 승인 필요. `McpIR`(`ir.ts:44-50`)에 `finalize?`/`sessionEnd?:"detached-finalizer"` 필드 추가는 **별도 승인 시**. Phase 3은 **기본값 + 문서만**(스키마 미변경).

---

## 5. Phase 4 — filid + imbas 이관

**현재 상태(실측):**
- **filid**: 동기-only 수명주기. `plugins/filid/src/mcp/server/registerShutdown.ts`(exit/SIGINT/SIGTERM → `cleanupOwnSessionCache`), `cleanupOwnSessionCache.ts`(동기, ~400ms grace), `bootSweep.ts`(동기 throttle-gated prune), `startServer.ts:8-14` 배선. **spawnDetached·--finalize 없음**. lifecycle이 `operations/`로 분해 안 됨(flat: `mcp/server/{registerShutdown,bootSweep,cleanupOwnSessionCache}.ts`). serverEntry에 --finalize 분기 없음.
- **imbas**: **수명주기 전무**. `plugins/imbas/src/mcp/server/server.ts:362-366` startServer는 transport connect만. registerShutdown/bootSweep/SessionEnd/sweep 없음. SessionEnd는 원래 **no-op**이었고 `549209b5`에서 제거됨 → **세션종료 작업 없음**.

**이관 방침:**
- **filid** (Type C, 동기): `registerShutdownFinalizer({ ctx: <projectRoot>, onShutdown: cleanupOwnSessionCache, /* detached 생략 */ })`로 수제 등록 교체. bootSweep(동기 prune)은 boot 폴백 유지. filid가 비동기 세션종료 작업이 **없으면 detached 불필요**(동기 경로만). filid `package.json`에 `@ogham/session-finalizer` 의존 추가. **filid는 훅 배럴 금지 규율 有** — 단 이 코드는 mcp/server(=배럴 경유 정상). filid도 `hooks: { SessionEnd: mcp-lifecycle }` 정본 선언 대상(컴파일러 마이그레이션 시).
- **imbas**: 세션종료 작업이 실제로 없으면 **registerShutdownFinalizer 도입 불필요**(빈 onShutdown은 무의미). 단 향후 정리작업이 생기면 shared 런타임 사용. **먼저 imbas가 정말 세션종료 작업이 0인지 재확인**(hooks.json·server.ts 전수) 후, 0이면 "Phase 4 imbas = 변경 없음(런타임 불요)"로 문서화, 있으면 filid와 동일 이관.
- **주의**: filid/imbas 이관은 ADR상 **플러그인별 decoupled** — maencof/Phase1-3와 독립 커밋. 각각 typecheck+test+build:plugin(bridge 복원).

---

## 6. 제약·게이트 (누락 금지)

- **빌드 산출물 미커밋**: `plugins/*/bridge/`, `shared/*/dist/`는 커밋 금지. AI는 src/skills/docs만 커밋, 빌드 산출물은 사용자가 직접(memory `feedback_cennad_build_artifacts_commit`). cross-platform·session-finalizer `dist/`는 **미추적** — 로컬 재빌드만(소비 위해), 커밋 안 함. build:plugin으로 bridge 재빌드 시 검증 후 `git checkout -- plugins/*/bridge` 복원.
- **pathspec 커밋**: 사용자가 병렬로 filid를 스테이징/커밋 중일 수 있음 → `git commit <명시 경로>` (pathspec, `--only` 시맨틱)로 내 파일만 커밋. `git add . && git commit` 금지(사용자 스테이징 쓸어감). 커밋 전 `git status --porcelain | grep -E 'plugins/filid|bridge/'` 0 확인.
- **plugins/\* child_process 금지** → `@ogham/cross-platform/spawn` 경유(spawnDetached). mcp-servers/\*는 반대(cross-platform 런타임 의존 금지) — 이건 plugins라 무관.
- **MCP 코드=배럴 import, 훅 코드=concrete**(번들 크기). session-finalizer 소비는 mcp/server 코드 → 배럴 정상.
- **@ogham/\* deep 서브패스 import**(루트 배럴 아님). session-finalizer는 단일 `.` export라 `@ogham/session-finalizer`.
- **FCA**: INTENT.md ≤50줄·3-tier(Always/Ask first/Never)·헤딩 영어·프로즈 [filid:lang]=ko. DETAIL.md 현재상태만. fractal 루트=배럴+INTENT/DETAIL, 로직은 1함수/파일. `/filid:scan`으로 위반 확인 가능.
- **IR 스키마 변경 Ask-first**(`tools/plugin-compiler/INTENT.md:34`) — Phase 3은 기본값+문서만.
- **커밋 co-author 금지**(사용자 전역 규칙). Changesets 은퇴(changeset 파일 생성 금지).
- **cross-platform detached 주의**: `spawnCli`의 `detached`는 관리형·POSIX 전용 — fire-and-forget엔 부적합. `spawnDetached`(신규, 이미 커밋)만 사용.

---

## 7. plugin-compiler 지형 (재조사 불요 — file:line)

- 구조: `tools/plugin-compiler/`(@ogham/plugin-compiler, private, tsx, **dist 없음**). `src/{types(IR·HostProfile),ir(load+extract→PluginIR),tokens,profiles(claude·codex·agy),emit(→FileMap),pipeline,verify(byte-equiv)}`. CLI: extract·compile·verify. INTENT.md/DETAIL.md 有, **README/TODO는 `.metadata/plugin-compiler/`에**.
- 정본 spec: `plugins/<pkg>/definitions/` → `PluginIR`(`src/types/ir.ts:92-113`). `McpIR`(`ir.ts:44-50`)={server,entry,transport?}. `HookIR`(`ir.ts:84-90`)={event,matcher,command,timeout?,fallback?}. `LogicalEvent`(`ir.ts:9-16`) incl `SessionEnd`. plugin.yaml `hooks:` → `hookOverrides`(`src/ir/load/parsePluginYaml.ts:15-20,51`).
- `mcp-lifecycle` fallback: `HookFallback` 변형(`ir.ts:29-34`), 계약 `ir.ts:22-27`("서버 shutdown 소유, 전 호스트 훅 미emit, 손실경고 없음"). emit: `emitHooks.ts:66-77`+`filterClaudeEvents(86-94)` Claude hooks.json에서 이벤트키 삭제; `agyTarget(35-48)` null; codex 훅 없음(`profiles/codex.ts:60`). lint: `lintHooks.ts:12-14` mcp-lifecycle 손실경고 제외.
- **선언적(코드젠 아님)**: MCP 서버 번들 verbatim 복사(`ASSET_ENTRIES "bridge"` `src/constants/layout.ts:8-14`; `emitAssets.ts:8-10`). `buildMcp`는 launch cmd만(`profiles/claude.ts:23-31`·`codex.ts:32-39`·`agy.ts:29-36`). → **finalizer/shutdown 코드젠 금지**; 런타임 소유, `node <entry>` + verbatim 번들 경로로 도달(`--finalize`는 `process.argv[1]` 재실행이라 3-호스트 공통).
- 기본 fallback: `parseHooks.ts:5-10` `FALLBACK` 맵, `SessionEnd:"stale-sweep"`(`:8`).
- 마이그레이션 상태: `TODO.md`(commit `6378169a` 도구+스펙+mcp-lifecycle 완료; **플러그인 미이관** — definitions/targets 부재). §3 컴파일러 mcp-lifecycle 완료, 런타임 per-plugin decoupled. §4 boot-sweep 런타임 open.

---

## 8. 검증 체크리스트 (각 Phase 후)

1. `yarn workspace @ogham/session-finalizer typecheck && test:run && build` (Phase 1).
2. 소비 플러그인: `yarn <pkg> typecheck` · `yarn <pkg> test:run` · `yarn <pkg> build:plugin`(가드) → **bridge 복원**.
3. maencof 스모크: `node plugins/maencof/bridge/mcp-server.cjs --finalize <mktemp -d>` → 빠른 exit 0.
4. plugin-compiler: `yarn workspace @ogham/plugin-compiler typecheck`. (parseHooks 변경 후 컴파일러 자체 테스트 있으면 실행.)
5. `/filid:scan`(선택)으로 FCA 위반 확인.
6. 커밋 전: `git status --porcelain | grep -E 'plugins/filid|bridge/|dist/'` 0 확인 → pathspec 커밋.

## 9. 착수 지점

Phase 1부터: `shared/cross-platform/{package.json,tsconfig*.json,vitest.config.ts}`를 템플릿으로 `shared/session-finalizer` 생성 → §1 API 구현(maencof `registerShutdown.ts`·`serverEntry.ts` 로직 추출) → 빌드 → 테스트. 그 다음 Phase 2(maencof 이관) → 3(compiler) → 4(filid/imbas).
