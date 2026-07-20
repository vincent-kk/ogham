# server -- MCP 서버 초기화 및 19개 도구 등록

## Purpose

MCP 서버 초기화, 19개 도구 등록, 세션 캐시 수명주기 소유 (boot sweep + shutdown 정리 — SessionEnd 훅 대체).

## Structure

- `createServer.ts` / `startServer.ts` / `serverHelpers.ts` — 서버 조립·기동
- `bootSweep.ts` — 부팅 시 스로틀 게이트 prune (보장 경로)
- `registerShutdown.ts` → `cleanupOwnSessionCache.ts` — exit/SIGINT/SIGTERM 시 자기 세션 캐시 동기 삭제 (best-effort)

프로젝트 루트는 `@ogham/cross-platform/host-paths`의 `tryProjectRoot()`로 해석한다. boot/shutdown 경로는 도구 입력이 없어 미해석이 가능하며, 이때는 프로젝트 스코프 작업(세션 prune·세션 캐시 삭제)을 **건너뛴다**. 전역 stale-cache prune 은 루트가 필요 없어 항상 실행.

## Boundaries

### Always do

- 변경 후 관련 테스트 업데이트
- 모든 도구 응답은 `toolResult`를 통해 compact JSON으로 직렬화
- shutdown 핸들러는 1회만 등록, 동기 작업만 (SIGKILL grace ~400ms 실측)

### Ask first

- 공개 API 시그니처 변경
- prune·shutdown 정책 변경

### Never do

- 모듈 경계 외부 로직 인라인
- 응답 직렬화에 indent 강제 (디버그는 `FILID_PRETTY_JSON=1` env 사용)
- shutdown 경로에 async 작업·모델 호출 추가
- 프로젝트 루트 미해석 시 `process.cwd()` 폴백 (플러그인 설치 디렉터리를 프로젝트로 오인해 청소)
