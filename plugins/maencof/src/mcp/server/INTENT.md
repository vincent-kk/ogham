# server

## Purpose

MCP 서버 설정 및 도구 등록. stdio 전송으로 Claude Code와 통신.

## Conventions

rebuild 성공 뒤의 후속 동기화는 middlewares가 소유한다.

## Boundaries

### Always do

- 도구 등록은 registrations/ organ에 위임, server.ts는 오케스트레이션만
- 핸들러는 각 도구 fractal의 진입점으로 가져온다 — 상위 tools 배럴을 경유하면 실제 소유 경계가 가려진다
- shared의 toolResult/toolError 사용
- mutate 도구는 `registerMutateTool`, freshness 필요 read는 `registerReadTool({ needsFreshness: true })` wrapper로만 등록
- read-path는 in-flight rebuild를 await하지 않는다 (non-blocking partial reindex)
- background rebuild 성공 시 `invalidateCache()`로 다음 read에서 disk reload
- MCP server는 단일 vault path 가정 하에 운영 (multi-vault 도입 시 backgroundRebuild mutex 재설계 필요)

### Ask first

- 새 도구 등록 시 해당 registrations/ 파일과 Zod 스키마 정의 필요
- middlewares 하위 fractal에 신규 책임 추가

### Never do

- `lifecycle` 밖의 서버 모듈에서 hooks 모듈을 import (세션 완결 로직을 실행하는 `lifecycle`에만 허용한 예외)
- 도구 로직을 server.ts 또는 registrations/ organ에 직접 구현
- graphCache/ 외부에서 캐시 상태 직접 조작
- read 도구 내부에서 await 기반 background rebuild 호출
- stale 메타정보를 도구 응답에 포함 (단, kg_status 진단 응답은 예외)
