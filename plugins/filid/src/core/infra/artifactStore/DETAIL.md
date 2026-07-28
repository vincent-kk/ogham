# artifactStore — Filid 1.0 Contract

## Requirements

- artifact와 MCP inline 응답은 Map/Set 정규화를 포함한 같은 compact JSON
  serializer를 사용한다.
- 실제 compact inline envelope가 UTF-8 16 KiB 이하일 때만 data를 inline한다.
- budget 초과 또는 `persistence: always`면 full `ToolPayload` JSON을 plugin
  cache의 content-addressed absolute path에 atomic 저장한다.
- persisted envelope는 inline data를 생략하고 artifact metadata를 반환하며,
  diagnostics 때문에 budget을 넘으면 full diagnostics는 artifact에 보존하고
  inline에는 artifact를 가리키는 bounded diagnostic 하나만 둔다.
- bounded diagnostic까지 적용한 summary와 metadata가 budget을 넘으면 full
  artifact를 쓴 뒤 stable contract error를 반환한다.
- 같은 content는 같은 SHA-256 path를 사용하며 metadata가 실제 bytes와 일치한다.
- artifact cache root 아래 기존 symlink descendant를 통과해 쓰지 않는다.
- write failure를 성공 envelope로 숨기지 않는다.

## API Contracts

- `materializeToolEnvelope(toolName, payload): ToolResultEnvelope`.
- `serializeCompactJson(value): string`은 artifact, byte budget과 transport가
  공유하는 단일 compact serializer다.
- `writeArtifactAtomic(path, content): void`는 `operations/`가 구현하고 entry
  point가 named export한다.
- tool name은 canonical MCP object enum 값이어야 한다.
- artifact media type은 `application/json`, `ephemeral`은 항상 true다.

## Acceptance Criteria

### AC-artifact-budget — Inline과 overflow

- 16 KiB 이하 payload data는 inline이고 artifact가 없다.
- 16 KiB 초과 payload와 always payload는 data 없이 artifact를 가진다.
- 최종 MCP text의 UTF-8 bytes는 항상 16 KiB 이하이며, oversized diagnostics는
  artifact에서 손실 없이 복원한다.

### AC-artifact-integrity — Content address

- artifact를 읽어 계산한 bytes와 SHA-256이 envelope와 정확히 같다.
- artifact JSON은 Map/Set을 정규화한 full payload를 복원할 수 있다.

### AC-artifact-containment — Cache boundary

- artifact target까지의 기존 descendant 중 symlink가 있으면 write 전에
  실패하고 cache 외부 파일을 만들거나 바꾸지 않는다.

## Last Updated

2026-07-27 — shared serializer, actual response budget와 symlink-safe artifact
계약.
