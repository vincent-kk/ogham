# personalContext

## Purpose

Personal Context 층(사용자 상태 `states` + 최근 동향 `topics`)의 IO·정규화·렌더·수명주기 커널. 볼트의 personal context 파일에 저장된 단일 envelope을 다룬다. 설계 정본: `.metadata/maencof/Claude-Code-Plugin-Design/27-personal-context.md`.

## Conventions

구조 정규화와 수명주기는 여기서, 필드 길이·형식 검증은 MCP 입력 경계에서 소유한다. 훅 경로에 무거운 스키마 런타임을 넣지 않는다.

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

- 렌더 시 저작 텍스트를 길이 예산에 맞춰 자르기 — 필드 길이는 저작 게이트가 통제하고, 최신 topic의 주입 개수 제한은 별도 수명주기 정책으로 유지한다
- 캡처/해소를 표면화하는 배너·통지 추가 (은닉 계약)
- mcp/ 또는 hooks/ 직접 의존 (core 경계)
