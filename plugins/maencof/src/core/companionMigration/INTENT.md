# companionMigration

## Purpose

companion-identity.json 레거시→정본 파일 마이그레이션(MCP 서버 기동 1회). hook은 얇게 유지하고 무거운 1회성 변환을 여기서 수행한다. 레거시 필드 매핑은 [`companionNormalize`](../companionNormalize/INTENT.md)를 재사용하고, CLAUDE.md의 떠도는 Communication/Tone 섹션을 정본 section으로 흡수해 단일 정본화한다.

## Structure

- `companionMigration.ts` — `runCompanionMigration` 오케스트레이터(멱등)
- `absorbClaudeMdTone.ts` — CLAUDE.md tone 섹션 scan(읽기)/remove(쓰기) 분리
- `backupPathFor.ts` — 타임스탬프 백업 경로

## Boundaries

### Always do

- schema_version ≥ 2면 no-op (멱등 — 매 기동 호출 안전)
- 정본 identity를 먼저 쓴 뒤에만 CLAUDE.md 제거(부분 실패 차단) + 쓰기 전 백업
- Zod(정본) 검증 통과분만 기록; 실패·오류는 격리(로그 후 원본 유지)
- CLAUDE.md 흡수는 컴패니언 이름이 등장하는 섹션만(안전 게이트), 미매칭 시 무변경

### Ask first

- 레거시→정본 매핑 규칙 변경 (companionNormalize와 동기)
- 매 턴 예산 초과 시 자동 강등 도입 여부(현재 경고만)

### Never do

- mcp/ · hooks/ 직접 의존 (core 경계)
- 마이그레이션 실패를 서버 기동으로 전파
