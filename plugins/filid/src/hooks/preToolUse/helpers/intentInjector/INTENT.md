# intentInjector -- PreToolUse INTENT.md 체인 주입

## Purpose

PreToolUse(Read) 이벤트에서 대상 파일의 상위 fractal을 찾아 `[filid:ctx]` 블록(intent 경로 + 인라인 본문 + chain + detail 힌트)과 `[filid:map]` 방문 맵을 주입한다. 세션당 최초 `[filid:guide]` 블록도 한 번 주입. (오케스트레이터가 Read에만 배선 — Write/Edit은 validator/guard 경로.)

## Structure

- `intentInjector.ts` — `injectIntent` + `recordWriteVisit` (Write/Edit 방문을 reads에만 기록 — unread-intent 신호 원천)
- `utils/` organ — `compressPaths`, `visitKey`, `displayDir` 등 보조 함수

## Conventions

- 캐시 경로: `fcaMap`(reads/intents/details) + 디렉토리별 boundary 캐시
- `fcaMap` 원소는 `{boundary}\t{relDir}` 복합 키 (모노레포 패키지 간 동일 relDir 충돌 방지); `[filid:map]` 표시 시에는 `\t` 뒤 relDir만 사용
- 소유자 fractal 탐색: 현재 디렉토리 → chain 상위로 첫 번째 `INTENT.md` 보유 dir 선택
- 최초 방문 시에만 `[filid:ctx]` 인라인 본문 주입, 재방문은 `[filid:map]`만 갱신
- `fcaMap`(reads/intents/details)은 UserPromptSubmit에서 턴마다 리셋 — 동일 턴에서 소유 fractal이 이미 주입되면 sibling organ 방문 시 재인라인 스킵 (`[filid:guide]`는 별도 세션-스코프 캐시로 세션당 1회 유지)
- `[filid:map]`은 `compressPaths` 결과 + `unread-intent` 목록 (reads에는 있지만 intents에 없는 경로) 포함
- session 첫 ctx 블록 직전에 `GUIDE_BLOCK`을 정확히 1회 삽입 (`markGuideInjected`)

## Boundaries

### Always do

- `buildChain` 결과의 boundary를 즉시 캐시해 이후 PreToolUse 호출에서 chain 재계산 회피
- 경로는 POSIX 슬래시(`/`)로 정규화 (Windows `\` 변환)

### Ask first

- `[filid:map]` 포맷 변경 (구문 파서가 읽는 계약)
- `GUIDE_BLOCK` 주입 빈도를 세션당 1회 외로 변경

### Never do

- 파일 write 수행 (`continue: true`만 반환하는 읽기 전용 훅)
- boundary 캐시를 세션 간 공유 (session_id 격리 필수)

## Dependencies

- `../../core/infra/cacheManager/` (`readBoundary`, `writeBoundary`, `readFractalMap`, `writeFractalMap`, `hasGuideInjected`, `markGuideInjected`)
- `../../core/tree/boundaryDetector/` (`buildChain`)
- `../../constants/agentContext.js` (`GUIDE_BLOCK`), `../../constants/documentFiles.js` (`INTENT_MD`, `DETAIL_MD`)
- `../shared/`, `../utils/validateCwd.js`, `./utils/compressPaths.js`
