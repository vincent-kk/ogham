# companionMigration

## Purpose

companion-identity.json 레거시→정본 파일 마이그레이션(MCP 서버 기동 1회). hook은 얇게 유지하고 무거운 1회성 변환을 여기서 수행한다. 레거시 필드 매핑은 [`companionNormalize`](../companionNormalize/INTENT.md)를 재사용한다. v1→v2 필드 매핑만 수행하며 CLAUDE.md는 건드리지 않는다. 매 턴 예산 초과 시 저살리언스 turn 섹션을 session으로 자동 강등해 500 이내로 맞춘다.

## Structure

- `companionMigration.ts` — `runCompanionMigration` 오케스트레이터(멱등) + 매 턴 예산 자동 강등

## Boundaries

### Always do

- schema_version ≥ 2면 no-op (멱등 — 매 기동 호출 안전)
- 쓰기 전 백업; Zod(정본) 검증 통과분만 기록; 실패·오류는 격리(로그 후 원본 유지)
- 매 턴 예산 초과 시 저살리언스 turn 섹션(inject turn|both)을 `inject:"session"`으로 자동 강등 (v1 합성 기본값 조정, 사용자 저작값 아님)

### Ask first

- 레거시→정본 매핑 규칙 변경 (companionNormalize와 동기)
- 예산 자동 강등 우선순위(salience 오름차순) 변경

### Never do

- CLAUDE.md 등 identity 외 파일 수정 (v1→v2 매핑 전용)
- mcp/ · hooks/ 직접 의존 (core 경계)
- 마이그레이션 실패를 서버 기동으로 전파
