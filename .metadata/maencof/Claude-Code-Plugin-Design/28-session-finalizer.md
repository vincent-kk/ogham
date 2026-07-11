---
created: 2026-07-11
updated: 2026-07-11
tags: [session-lifecycle, finalization, shutdown, detached-process, cross-platform]
layer: design-area-3
status: proposal
---

# 세션 완결 detached finalizer — "다음 부팅 의존" 갭 해소

> 상태: **설계 제안(미구현)**. 승인 후 구현. 관련: [기억 라이프사이클](./13-memory-lifecycle.md) · [크래시 복구](./15-crash-recovery.md) · [한계와 제약](./26-constraints-and-limitations.md)

## 1. Problem

SessionEnd 훅 은퇴(issue-78) 이후 세션 종료 완결은 두 경로가 소유한다:

- **`registerShutdown`** (exit/SIGINT/SIGTERM) — 동기 경량만: turn-context 폐기 + `CLAUDE_CODE_SESSION_ID` 정밀 마감·캐시 삭제·digest. **git 등 async 금지** (SIGKILL grace ~400ms 실측; 절단 시 `.git/index.lock` 잔존 위험).
- **`bootSweep`** (다음 MCP 부팅) — 보장 경로: turn-context → sweep(+digest) → personalContext prune → changelogDebt → archiveExpired → vaultCommitter.

**갭**: 무거운 완결(vault 자동 커밋·changelog·아카이빙·prune)이 **"같은 vault의 다음 부팅"에 종속**된다. 사용자가 그 vault를 다시 열지 않으면(프로젝트 전환·장기 방치) 마지막 세션의 변경은 **영구 미커밋**으로 남는다. 데이터 유실은 아니다(디스크에 존재, 수동 커밋 가능) — 하지만 "세션 종료 시 자동 커밋" 보장이 "다음에 또 열어야 커밋"으로 축소되고, 이를 알리는 신호도 없다.

## 2. Goal / Non-Goal

**Goal**: 정상 종료(SIGINT/SIGTERM) 시 완결을 재부팅 없이 세션 직후 완료. 3-호스트 이식 유지(MCP 수명주기, Claude 전용 아님). shutdown grace 내 동기 git 금지 불변식 유지.

**Non-Goal**: 하드 `SIGKILL`(OOM·강제 kill로 핸들러 미실행)까지 커버 — 이 경우는 기존 `bootSweep` 폴백에 의존(하드킬 + 영구 미재개 이중 엣지, 드묾). 세션 중 상시 커밋(비용↑, 리팩터 취지 역행) 미도입.

## 3. Design — detached finalizer

핵심 통찰: grace에서 금지되는 것은 **동기 git 실행**이지 **프로세스 스폰**이 아니다(스폰 수십 ms).

`registerShutdown`이 SIGINT/SIGTERM 핸들러에서 **독립(detached) 자식 프로세스를 스폰만** 하고 즉시 반환한다. 자식은 부모(MCP 서버)의 SIGKILL에 **묶이지 않고** `bootSweep` 체인을 **자기 시간에** 완료한다(grace 제약 밖 → git 안전). `bootSweep`은 **멱등 폴백**으로 유지 — 자식 미완/하드킬 시 다음 부팅이 완결(설계 불변식 "이중 실행 무해").

```
[session ends] SIGINT/SIGTERM
   → registerShutdown (sync, <400ms):
        turn-context 폐기 + 정밀 마감/캐시 삭제 (기존)
        + spawn(detached, unref, stdio:ignore) bridge/session-finalize.mjs <vaultPath>   ← 신규
   → (부모 SIGKILL)
[독립 프로세스] session-finalize.mjs:
        bootSweep(vaultPath)   // changelogDebt·archiveExpired·vaultCommitter·prune, 자기 시간에
```

## 4. Mechanism

- **스폰**: `spawn(process.execPath, [finalizeScript, vaultPath], { detached: true, stdio: 'ignore' }).unref()`. `process.execPath`로 현재 Node 재사용, `finalizeScript`는 MCP 서버 번들이 자신의 `bridge/` 위치에서 해석(`import.meta.url` 기준).
- **스폰 지점**: **SIGINT/SIGTERM** 핸들러(grace 존재)가 1차. `'exit'` 핸들러는 동기 전용·Node teardown 중이라 스폰 신뢰성이 낮음 → best-effort(중복 스폰은 자식 측 lock으로 무해, §6). 정상 종료의 대다수는 SIGTERM/SIGINT.
- **자식 스크립트**(`session-finalize`): argv에서 vaultPath를 읽어 `bootSweep(vaultPath)` 1회 실행 후 종료. sweep이 shutdown에서 이미 동기 실행됐어도 멱등이라 무해(재-sweep은 no-op 수준). sessionId 불필요(bootSweep은 전 stale 세션 대상).

## 5. Cross-platform

- 저장소에 **detached fire-and-forget 선례 존재**: `@ogham/cross-platform` `launcher/openBrowser.ts`(`detached:true + unref() + stdio:'ignore'`), deilen·r-statistics도 사용.
- **주의**: `@ogham/cross-platform` `spawnCli`의 `detached`는 **관리형**(kill/abort 추적) + **POSIX 전용**(`useDetached = detached && platform !== 'win32'`)이라 **fire-and-forget daemon에는 부적합**. → 신규 헬퍼 **`spawnDetached`/`spawnDaemon`**(반환 즉시 unref, 미추적)을 `@ogham/cross-platform/spawn`에 추가 권장.
- **POSIX**: detached는 자식이 자기 프로세스 그룹 리더 → 부모 종료·그룹 시그널과 분리.
- **Windows**: `detached:true, windowsHide:true, stdio:'ignore'` + unref. win32는 프로세스 그룹 모델이 달라 별도 경로 필요(spawnCli가 win32 detached를 끄는 이유). daemon 헬퍼가 win32 분기 소유.
- maencof은 **plugin**(plugins/maencof)이라 `@ogham/cross-platform` 런타임 의존 허용([project_mcp_servers_no_cross_platform_runtime]는 mcp-servers/* 한정). finalizer 번들은 esbuild가 cross-platform을 인라인.

## 6. Concurrency & index.lock

detached finalizer 실행 중 사용자가 **빠르게 재개** → 다음 MCP boot의 `bootSweep`과 **동시 실행** 가능. 둘 다 `vaultCommitter`에서 git 커밋 시도.

- 1차 방어: git 자체 `index.lock` 직렬화 + 기존 `reclaimStaleIndexLock`(stale lock 회수) + `bootSweep` 멱등성.
- 잔여 위험: 진짜 동시 커밋 2건 or lock 경합. → **결정 필요**(§9): (a) 기존 방어에 의존, (b) `.maencof-meta/finalizing.lock`(pid+timestamp) 마커로 최근 finalizer 진행 시 bootSweep이 skip. 우선 (a)로 시작하고 통합 테스트로 경합 관측 시 (b) 추가 권장.

## 7. Edge cases & fallback

| 상황 | 처리 |
|---|---|
| 하드 SIGKILL(핸들러 미실행) | bootSweep 폴백(다음 부팅). 미커버(Non-Goal). |
| 스폰 실패 | bootSweep 폴백. 스폰은 try/catch, 실패 무시. |
| 자식 크래시(git 실패 등) | bootSweep 폴백(멱등 재실행). 자식은 `appendErrorLogSafe`로 자기 로그. |
| 스크립트 경로 미해석 | 스폰 실패 처리와 동일 → 폴백. |
| `'exit'`만 발생(SIGINT 없이) | best-effort 스폰; 실패 시 폴백. |

원칙: finalizer는 bootSweep의 **가속**일 뿐, 새 단일 실패점이 아니다. 모든 실패가 기존 보장 경로로 흡수된다.

## 8. Build integration

- `scripts/build-hooks.mjs` 엔트리 리스트에 `session-finalize` 추가 → `bridge/session-finalize.mjs`.
- 소스: `src/mcp/server/lifecycle/finalizer/session-finalize.entry.ts`(argv 파싱 → `bootSweep`). 훅류 번들 규율 준수: **concrete import**(배럴 금지), byte-cap + FORBIDDEN_PATTERNS 가드 편입.
- registerShutdown이 번들 경로를 알아야 함(`bridge/session-finalize.mjs`) — 서버 번들 기준 상대 해석.

## 9. Open decisions (승인 시 확정)

1. **daemon 헬퍼**: 신규 `@ogham/cross-platform/spawn::spawnDetached` vs finalizer 인라인 spawn. (권장: 재사용 위해 헬퍼)
2. **동시성 dedup**: index.lock+멱등 의존(a) vs finalizing 마커(b). (권장: a로 시작)
3. **finalizer 범위**: `bootSweep` 전체 재실행 vs shutdown 미실행분만. (권장: 전체 — 멱등이라 단순)
4. **'exit' 스폰**: 포함 vs SIGINT/SIGTERM만. (권장: SIGINT/SIGTERM 우선, exit는 best-effort 옵션)

## 10. Alternatives considered

- **전역 pending-finalization 레지스트리**(shutdown이 "vault X 미완결" 기록 → 다음 부팅이 **어느 vault든** 드레인): 재부팅은 필요(약한 보장) + cross-vault git 조작(vault B에서 vault X 커밋) 아키텍처 복잡. detached finalizer가 더 강한 보장 + 로컬성으로 우세.
- **세션 중 상시/주기 커밋**: per-turn 비용↑ + 최종 상태 미보장. 리팩터 취지 역행.
- **SessionEnd 훅 복원**: Claude 전용 → 3-호스트 이식성 상실(issue-78이 제거한 이유).

## 11. Test strategy

- unit: registerShutdown이 SIGTERM에서 올바른 argv·`{detached,stdio:'ignore'}`로 spawn + unref 호출(스폰 mock).
- integration: 실제 finalizer 스폰 → 임시 vault에서 커밋 산출 확인.
- idempotency: finalizer + bootSweep 연속/동시 → 최종 1회 클린 결과(중복 커밋·lock 잔존 없음).
- cross-platform: POSIX 그룹 분리 + win32 분기(가능 범위).
