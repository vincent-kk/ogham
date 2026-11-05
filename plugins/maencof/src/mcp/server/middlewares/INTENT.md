# middlewares

## Purpose

MCP 서버 read/mutate 도구가 공유하는 미들웨어 계층. freshness gating, background/동기 인덱스 재빌드, 재빌드 성공 후 turn-context 스냅샷 갱신, stale-entry·usage 통계 관리를 담당하는 fractal.

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
