# cache-manager -- 세션/프롬프트 캐시 및 프랙탈 맵 관리

## Purpose

세션/프롬프트 캐시 및 프랙탈 맵 관리.

## Structure

`cache-manager.ts`는 slim facade로, `caches/` organ의 6개 파일을 re-export한다.

| 파일 | 담당 |
|------|------|
| `caches/session-cache.ts` | cwdHash, getCacheDir, sessionIdHash, 세션 마커 관리 |
| `caches/prompt-context-cache.ts` | 프롬프트 컨텍스트 읽기/쓰기/존재확인 |
| `caches/boundary-cache.ts` | 경계 캐시 읽기/쓰기 |
| `caches/fractal-map-cache.ts` | FractalMap 읽기/쓰기/삭제 + FractalMap 타입 |
| `caches/run-hash-cache.ts` | 스킬 실행 해시 저장/읽기 |
| `caches/guide-cache.ts` | 가이드 주입 마커 확인/기록 |

## Boundaries

### Always do
- 변경 후 관련 테스트 업데이트

### Ask first
- 공개 API 시그니처 변경

### Never do
- 모듈 경계 외부 로직 인라인
- `caches/` organ에 INTENT.md 추가
