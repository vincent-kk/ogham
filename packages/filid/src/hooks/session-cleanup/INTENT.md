# session-cleanup -- SessionEnd 캐시 정리

## Purpose

SessionEnd 이벤트에서 해당 세션이 남긴 `session-context-{hash}` 마커와 `cached-context-{hash}` 캐시 파일을 삭제해 세션 간 상태 누출을 방지한다. 엔트리 포인트는 매우 얇으며 실제 삭제는 `core/infra/cache-manager.removeSessionFiles`에 위임한다.

## Structure

- `session-cleanup.ts` — `cleanupSession` (thin wrapper)
- `session-cleanup.entry.ts` — esbuild 번들 진입점

## Conventions

- 훅 함수는 `cleanupSession(input)` 단일 함수만 export
- 내부 로직 없음 — 입력 검증이나 필터링 없이 `removeSessionFiles(session_id, cwd)` 즉시 호출
- 반환은 언제나 `{ continue: true }` — SessionEnd는 어떤 경우에도 차단 불가
- 파일 삭제 실패는 `removeSessionFiles` 내부에서 조용히 무시 (호출자에 전파 금지)

## Boundaries

### Always do

- entry 파일은 stdin→핸들러→stdout 파이프만 유지 (로직 금지)
- 예외가 발생해도 `{ continue: true }` 반환으로 세션 종료 차단 방지

### Ask first

- 삭제 대상 캐시 파일 종류 확장 (예: `fmap`, `boundary`까지 삭제)
- 세션 id 외 추가 필터 도입

### Never do

- 전체 `.filid/` 디렉토리를 통째로 삭제 (다른 세션 영향)
- SessionEnd 훅을 async로 전환 (현재 동기 계약 유지)

## Dependencies

- `../../core/infra/cache-manager/` (`removeSessionFiles`)
- `../../types/hooks.js` (`SessionEndInput`, `HookOutput`)
