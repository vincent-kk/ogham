# adapters — ecosystem evidence boundary

## Purpose

생태계별 파일·entry point·dependency·verification 사실을 수집해 언어 중립 core 계약으로 변환한다.

## Structure

- `registry/` organ — adapter 등록, project claim과 file ownership 해석
- `ecmascript/` — 초기 JavaScript/TypeScript 생태계 adapter
- `index.ts` — 공통 계약과 등록된 adapter의 named public surface

## Conventions

- 판단 우선순위: 1. 오탐 방지 2. 정확한 증거 3. 생태계 coverage
- adapter ID와 모든 생태계 리터럴은 각 adapter 안에 둔다.
- 모호한 구문은 억지로 해석하지 않고 indeterminate/unsupported로 남긴다.

## Boundaries

### Always do

- file ownership claim에 adapter ID, confidence와 evidence를 보존
- 같은 confidence의 중복 ownership을 명시적 ambiguity finding으로 반환
- candidate 선택과 evidence 탐지를 분리해 snapshot에서 detect를 반복하지 않음
- entry point override의 파일명 의미는 대상 adapter 안에서만 해석
- source discovery는 Node 20 `readdir` recursion으로 구현
- 요청됐으나 등록되지 않은 adapter ID는 config warning이 아니라 validation finding으로 반환

### Ask first

- 공통 StructureAdapter/VerificationAdapter 계약 변경
- 기본 등록 adapter 또는 claim arbitration 정책 변경

### Never do

- core rule이나 MCP DTO에 생태계 리터럴을 밀어 넣기
- 새 생태계 adapter 추가가 core type, policy rule 또는 MCP schema 변경을 요구하게 만들기
- native parser, 전역 npm module 또는 `fast-glob` 요구
- unsupported 증거를 PASS로 변환

## Dependencies

- `../types/`, Node filesystem/path APIs
