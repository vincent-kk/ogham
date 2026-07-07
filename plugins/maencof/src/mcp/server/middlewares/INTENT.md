# middlewares

## Purpose

MCP 서버 read/mutate 도구가 공유하는 미들웨어 계층. freshness gating, background/동기 인덱스 재빌드, 재빌드 성공 후 turn-context 스냅샷 갱신, stale-entry·usage 통계 관리를 담당하는 fractal.

## Structure

| 파일                         | 역할                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `index.ts`                   | 배럴 — 하위 파일의 함수/타입 재노출                                                                       |
| `freshnessGuard.ts`          | read-path non-blocking freshness gate (`ensureFreshGraphNonBlocking`)                                     |
| `backgroundRebuild.ts`       | fire-and-forget background rebuild + 모듈 mutex (`triggerBackgroundRebuild`, `triggerBootRebuildIfStale`) |
| `rebuildAndInvalidate.ts`    | 동기 kg_build 재빌드 + 캐시 invalidate (`rebuildAndInvalidate`)                                           |
| `refreshTurnContext.ts`      | 재빌드 성공 직후 turn-context 스냅샷 재생성 (`refreshTurnContextSafe`)                                    |
| `mutateSideEffects.ts`       | mutate 도구 성공 후 stale-entry append + usage stat + 임계치 rebuild 트리거                               |
| `partialReindex.ts`          | stale node in-memory 병합 (node replace/delete + edge 파생 맵 재구성)                                     |
| `registerWithSideEffects.ts` | `registerMutateTool` / `registerReadTool` 등록 wrapper                                                    |
| `usageStats.ts`              | vault별 도구 사용 카운터 (atomic write)                                                                   |
| `vaultWalk.ts`               | 외부 vault 변경 감지 → stale 마킹                                                                         |

## Conventions

- 파일당 primary export 1개 원칙 유지 (organ으로 더 쪼개지 않는 flat fractal).
- 실패는 `appendErrorLogSafe`로 흘리고 caller 흐름을 막지 않는 best-effort 패턴을 따른다.

## Boundaries

### Always do

- 소비는 배럴 `index.ts` 경유로만 (server.ts, registrations/ 등에서 내부 파일 직접 import 금지)
- 인덱스 (재)빌드 성공 분기에서 `invalidateCache()` 직후 `refreshTurnContextSafe()` 호출 유지
- background rebuild는 절대 await하지 않는다 (read-path 비차단 유지)

### Ask first

- 신규 side-effect(새 통계 항목, 새 재빌드 트리거 조건 등) 추가

### Never do

- registrations/ 의 도구 등록(registration) 로직을 이 모듈로 끌어오기
- freshness/rebuild mutex를 우회한 직접 그래프 캐시 조작

## Dependencies

- `../graphCache` — 캐시 상태 조회/무효화
- `../../tools/kgBuild` — 인덱스 (재)빌드 실행
- `../../../core/{indexer,errorLog,graphBuilder,documentParser,cacheManager,turnContext}` — 저장소·로그·그래프·turn-context 원시 연산
