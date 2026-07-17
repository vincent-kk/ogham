# cacheManager -- 세션/프롬프트 캐시 및 프랙탈 맵 관리

## Purpose

세션/프롬프트 캐시 및 프랙탈 맵 관리.

## Structure

`cacheManager.ts`는 slim facade로, `caches/` organ의 7개 파일을 re-export한다.

| 파일                           | 담당                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `caches/sessionCache.ts`       | cwdHash, getCacheDir, getPluginRoot, sessionIdHash, 세션 마커, prune throttle 게이트 (글로벌/세션) |
| `caches/promptContextCache.ts` | 프롬프트 컨텍스트 읽기/쓰기/존재확인                                                               |
| `caches/boundaryCache.ts`      | 경계 캐시 읽기/쓰기                                                                                |
| `caches/fractalMapCache.ts`    | FractalMap 읽기/삭제 + FractalMap 타입 (턴 스코프)                                                 |
| `caches/commitVisit.ts`        | 방문 판정·기록 원자 트랜잭션 (전달 상태 + lastMap CAS + guide, lock 내부)                          |
| `caches/deliveredCache.ts`     | 세션 epoch 전달 기록 (ownerKey → 전달 turn-stamp) 읽기                                             |
| `caches/turnCounter.ts`        | 세션 턴 카운터 읽기/증가 (TTL 기준값)                                                              |
| `caches/runHashCache.ts`       | 스킬 실행 해시 저장/읽기                                                                           |
| `caches/guideCache.ts`         | 가이드 주입 마커 확인/기록                                                                         |
| `caches/modeAuditCache.ts`     | spike 모드 게이트 판정 audit (JSONL append); `ModeAuditEntry` 타입                                 |

## Boundaries

### Always do

- 변경 후 관련 테스트 업데이트

### Ask first

- 공개 API 시그니처 변경

### Never do

- 모듈 경계 외부 로직 인라인
- `caches/` organ에 INTENT.md 추가
