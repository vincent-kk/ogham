# cacheManager — Filid 1.0 Contract

## Requirements

- host hook의 session, prompt context, boundary, fractal map, delivery turn과 guide 상태를 plugin cache에 저장한다.
- cache는 성능 최적화일 뿐 FCA 판정의 장기 원장이나 acceptance ledger가 아니다.
- main session과 host가 식별 가능한 subagent scope를 분리한다. 식별 증거가 없으면 보수적으로 main scope로 저하한다.
- 방문 판정과 delivery 기록은 `commitVisit`의 단일 원자 transaction에서 직렬화한다.
- cache I/O와 정리는 best-effort이며 hook 또는 MCP server lifecycle을 실패시키지 않는다.
- criteria, spike, agent-role, promotion, debt 또는 review verdict 상태를 소유하지 않는다.
- review artifact와 큰 MCP payload는 별도 `artifactStore`가 소유한다.

## API Contracts

- `getCacheDir(cwd): string` — project identity로 격리된 plugin cache 경로를 반환한다.
- `isFirstInSession`, `markSessionInjected`, `removeSessionFiles` — session epoch 상태를 관리한다.
- `readPromptContext`, `writePromptContext`, `hasPromptContext` — prompt context cache를 관리한다.
- `readBoundary`, `writeBoundary`, `readFractalMap`, `removeFractalMap` — 구조 탐색 cache를 관리한다.
- `commitVisit(cwd, scope, input): VisitDecision` — delivery freshness, map change와 guide 필요 여부를 원자적으로 결정한다.
- `readTurn`, `incrementTurn`, `hasGuideInjected`, `markGuideInjected` — turn과 guide delivery를 관리한다.
- `pruneOldSessions`, `pruneStaleCacheDirs` — cache lifecycle cleanup을 best-effort로 수행한다.
- 공개 함수는 cache miss 또는 I/O 실패 시 안전한 빈 값으로 저하하며 project source를 변경하지 않는다.

## Acceptance Criteria

### AC-cache-ephemeral — 임시 상태

- cache 삭제 후 다음 요청은 repository 증거에서 상태를 재구성할 수 있다.
- `.filid/criteria.md`나 review verdict를 cache의 권위 있는 입력으로 읽지 않는다.

### AC-cache-isolation — scope 격리

- 판별 가능한 main/subagent scope의 방문과 delivery 상태는 서로 오염되지 않는다.
- 병렬 방문에서 동일 context/map delivery가 중복 방출되지 않는다.

### AC-cache-lifecycle — 실패 격리

- cleanup과 쓰기 실패는 hook 또는 MCP server 종료 경로를 실패시키지 않는다.

## Last Updated

2026-07-26 — criteria/spike/agent 역할 상태를 제거한 1.0 cache 경계로 재정의했다.
