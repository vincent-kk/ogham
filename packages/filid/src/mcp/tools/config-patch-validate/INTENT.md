# config-patch-validate — MCP tool

## Purpose

`.filid/config.json` 패치 후보를 `FilidConfigSchema`로 엄격 검증한다. Phase D 챔피언/페르소나가 환각한 config 키를 fix-requests에 올리기 전에 차단한다.

## Boundaries

### Always do

- 스키마는 SSoT인 `../../../core/infra/config-loader`에서 import만 한다.

### Ask first

- 응답 필드 추가 (현행: `valid | errors | suggestion`).

### Never do

- `FilidConfigSchema`·`RuleOverrideSchema`·`AllowedEntrySchema`를 본 fractal 안에서 로컬 재정의한다 (AC12 SSoT 위반).
