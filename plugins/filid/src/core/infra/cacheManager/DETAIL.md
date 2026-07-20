# cacheManager — Detail

## Requirements

세션/프롬프트/경계/프랙탈맵/전달기록/턴카운터/런해시/가이드/모드감사 캐시를
`~/.claude/plugins/filid/{cwdHash}/` 디렉토리에 파일로 저장한다.

전달 모델(intentInjector가 소비): "규칙이 live 컨텍스트에 존재하면 전달된 상태".
전달 기록은 세션 epoch 스코프(compact/clear에 리셋), 방문 맵은 턴 스코프, 경계
캐시는 파일시스템 사실이므로 세션 내 무기한 유지.

## Scope Model

훅 이벤트의 캐시 스코프는 `visitScope`(hooks/utils)가 도출한다: 페이로드의
`transcript_path`가 서브에이전트 트랜스크립트(`<session>/subagents/agent-*.jsonl`)를
가리키면 메인 세션과 분리된 스코프를 갖는다. **2026-07-17 실측: 현행 Claude Code는
서브에이전트 이벤트에 판별 가능한 transcript_path를 제공하지 않아 session_id 공유
동작으로 강등 상태** — 서브에이전트 방문이 메인 delivered를 오염시키는 창이 TTL
(기본 5턴)만큼 존재하며, 호스트가 판별 필드를 제공하면 격리가 자동 활성화된다.
스코프별 저장:

- **메인 스코프**: `fmap-{sh}.json` + `delivered-{sh}.json` + `turn-{sh}` + `guide-{sh}`
- **서브 스코프**: `fmap-{sh}-sub-{ah}.json` 단일 파일 (delivered/guideShown 필드 내장,
  TTL 없음 — 서브에이전트 수명 ≈ 턴이므로 fmap 수명이 곧 전달 기록 수명)

## API Contracts

| 함수                  | 출처 파일          | 시그니처                                                                     |
| --------------------- | ------------------ | ---------------------------------------------------------------------------- |
| `cwdHash`             | sessionCache       | `(cwd: string) => string`                                                    |
| `getCacheDir`         | sessionCache       | `(cwd: string) => string`                                                    |
| `sessionIdHash`       | sessionCache       | `(sessionId: string) => string`                                              |
| `isFirstInSession`    | sessionCache       | `(sessionId, cwd) => boolean`                                                |
| `markSessionInjected` | sessionCache       | `(sessionId, cwd) => void`                                                   |
| `pruneOldSessions`    | sessionCache       | `(cwd) => void`                                                              |
| `pruneStaleCacheDirs` | sessionCache       | `() => void`                                                                 |
| `removeSessionFiles`  | sessionCache       | `(sessionId, cwd) => void` — 세션 epoch 상태 전체 제거 (아래 참조)           |
| `getPluginRoot`       | sessionCache       | `() => string`                                                               |
| `isPruneDue`          | sessionCache       | `() => boolean`                                                              |
| `markPruneRun`        | sessionCache       | `() => void`                                                                 |
| `isSessionPruneDue`   | sessionCache       | `(cwd: string) => boolean`                                                   |
| `markSessionPruneRun` | sessionCache       | `(cwd: string) => void`                                                      |
| `readPromptContext`   | promptContextCache | `(cwd, sessionId) => string \| null`                                         |
| `writePromptContext`  | promptContextCache | `(cwd, context, sessionId) => void`                                          |
| `hasPromptContext`    | promptContextCache | `(sessionId, cwd) => boolean`                                                |
| `readBoundary`        | boundaryCache      | `(cwd, sessionId, dir) => string \| null`                                    |
| `writeBoundary`       | boundaryCache      | `(cwd, sessionId, dir, boundaryPath) => void`                                |
| `readFractalMap`      | fractalMapCache    | `(cwd, scope) => FractalMap`                                                 |
| `removeFractalMap`    | fractalMapCache    | `(cwd, sessionId) => void` — `fmap-{sh}` prefix 일괄 제거 (서브 스코프 포함) |
| `commitVisit`         | commitVisit        | `(cwd, scope, args) => VisitDecision` — 아래 Visit Transaction 참조          |
| `readDelivered`       | deliveredCache     | `(cwd, sessionId) => Record<string, number>` (advisory 사전 판정용)          |
| `readTurn`            | turnCounter        | `(cwd, sessionId) => number`                                                 |
| `incrementTurn`       | turnCounter        | `(cwd, sessionId) => number` — UserPromptSubmit에서 호출                     |
| `saveRunHash`         | runHashCache       | `(cwd, skillName, hash) => void`                                             |
| `getLastRunHash`      | runHashCache       | `(cwd, skillName) => string \| null`                                         |
| `hasGuideInjected`    | guideCache         | `(sessionId, cwd) => boolean`                                                |
| `markGuideInjected`   | guideCache         | `(sessionId, cwd) => void`                                                   |
| `appendModeAudit`     | modeAuditCache     | `(cwd, entry: ModeAuditEntry) => void`                                       |

`FractalMap`: `{ reads: string[]; lastMap?: string; delivered?: Record<string, true>; guideShown?: boolean }`.
`reads` 원소는 `{boundaryAbsPath}\t{relDir}` 복합 키 (모노레포 동일 relDir 충돌 방지).
`lastMap`은 마지막 방출 canonical map (last-writer-wins). `delivered`/`guideShown`은
서브 스코프 전용 필드. 구 스키마의 `intents`/`details` 필드는 폐기 — `intents`는
세션 스코프 `delivered-{sh}.json`(ownerKey → 전달 turn-stamp)으로 승격, `details`는
소비자가 없어 삭제.

## Visit Transaction

`commitVisit(cwd, scope, { readKey, ownerKey, ttl })` — 방문 판정·기록의 단일 원자
지점. fmap lock(`{file}.lock` mkdir 뮤텍스, 100ms 상한·1s stale 강제 해제·타임아웃
시 lockless 강등) 안에서:

1. on-disk fmap(+메인이면 delivered/turn)을 재독해 `deliveredState` 판정 —
   `none`(무전달) / `stale`(경과 턴 ≥ ttl) / `fresh`(경과 턴 < ttl; 서브 스코프는 none/fresh 이진)
2. `ownerKey` 존재 + state ≠ fresh → 전달 stamp (메인: 현재 턴, 서브: true)
3. `readKey` 존재 → `reads` union 병합 (deny 경로는 null로 미기록)
4. canonical(reads 정렬 유니크 relDir) ≠ `lastMap` → `mapChanged: true` + CAS
5. guide 미주입 + ctx 방출 예정(state ≠ fresh) → `guideNeeded: true` + 마킹
6. tmp + rename 원자 교체 후 `{ deliveredState, mapChanged, guideNeeded }` 반환

바깥(호출부)의 `readFractalMap`/`readDelivered` 판정은 advisory 사전 필터일 뿐,
방출 여부의 최종 권위는 항상 lock 안의 이 트랜잭션이다 — 병렬 Read 배치의
ctx/map 중복 방출을 직렬화로 제거한다.

`appendModeAudit`는 spike 모드 게이트의 allow/deny/exempt 판정을
`{cacheDir}/mode-audit.jsonl`에 JSONL로 누적한다 (절대 throw하지 않음).

## Intentional Cross-Concern Coupling

`pruneOldSessions`와 `removeSessionFiles`는 세션의 모든 연관 캐시 파일을 함께
제거하기 위해 파일명 규약을 공유한다. prefix 리터럴은
`caches/constants/cacheFiles.ts`의 `CACHE_PREFIX`가 단일 출처이며 양쪽이 동일
상수를 참조한다 — 세션 스코프 파일 집합 자체의 변경은 Ask-first 경계를 적용한다.
`removeSessionFiles`는 setup 훅의 compact/clear epoch 리셋 경로에서도 재사용된다
(boundary까지 제거되지만 파일시스템 사실이라 재계산 비용만 지불, 정합성 무해).

## Last Updated

2026-07-17
