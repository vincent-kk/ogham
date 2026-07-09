# personalContext

## Purpose

Personal Context 층(사용자 상태 `states` + 최근 동향 `topics`)의 IO·정규화·렌더·수명주기 커널.
`.maencof-meta/personal-context.json` 단일 envelope을 다룬다. 설계 정본:
`.metadata/maencof/Claude-Code-Plugin-Design/27-personal-context.md`.

## Structure

- `normalizePersonalContext.ts` — zod-free graceful 정규화
- `defaultPersonalContext.ts` — 빈 envelope 기본값 생성
- `readPersonalContext.ts` — 파일 로드
- `personalContextPath.ts` — envelope 파일 경로 해석
- `writePersonalContext.ts` — 직렬화 저장
- `renderPersonalContextBlock.ts` — SessionStart `<personal-context>` 블록 렌더 (캡처 지침 내장, 만료 lazy-filter)
- `prunePersonalContext.ts` — SessionEnd 수명주기 정리 (만료 제거·due 자동 resolve·보존 캡)
- `evictTopicsOverCap.ts` — topics 보존 캡 집행 (resolved 우선)
- `applyPersonalContextMutation.ts` — MCP 캡처/재강화/해소 upsert (훅 번들 미진입)

## Boundaries

### Always do

- 훅 도달 파일(normalize/read/write/render/prune/evict)은 zod-free + Node builtins만 유지
- 필드 길이·형식 검증은 MCP 입력 스키마(`capture_personal_context`)에 위임 — 여기서는 구조 정규화와 수명주기 규칙만
- id는 `sanitizeSegment(label)`로만 생성 (dedup 키 결정성)
- 수치 정책(캡·TTL·보존 기간)은 `constants/personalContext.ts`에서만 가져옴

### Ask first

- 캡·TTL·보존 기간 상수 변경
- 새 섹션(kind) 추가 — 27 문서의 확장 절차와 동기 유지

### Never do

- 렌더에 런타임 컷 도입 (예산은 저작 게이트가 통제 — companion 철학)
- 캡처/해소를 표면화하는 배너·통지 추가 (은닉 계약)
- mcp/ 또는 hooks/ 직접 의존 (core 경계)
