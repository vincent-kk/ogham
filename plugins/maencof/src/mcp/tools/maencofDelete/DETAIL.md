# maencofDelete — Contract

## Requirements

- `delete` 는 vault 문서를 삭제한다. L1(`01_Core/`) 문서는 삭제를 거부한다(정체성 보호 — identity-guardian 안내 message).
- backlink 가 있는 문서는 `force: true` 없이는 삭제를 거부한다. 거부 응답의 warnings 는 `Referenced by: <src>` 를 `MAX_DELETE_BACKLINK_WARNINGS`(constants/thresholds)까지 나열하고, 초과분은 `…and N more` 요약 한 줄로 대체한다 — 대량 참조 문서에서 응답 범람을 막는 상한이다.
- `force: true` 삭제 성공 시 backlink 인덱스에서 해당 문서를 제거하고, 끊어진 backlink 총수를 요약 warning 한 줄로 보고한다.
- 성공 message 는 `'Document deleted'` — 경로는 `path` 필드가 이미 담으므로 재진술하지 않는다.
- 경로는 `resolveWithinVault` 로 vault 봉쇄를 검증하고, 파일 부재는 `success: false` 결과다.

## API Contracts

- `handleMaencofDelete(vaultPath: string, input: MaencofDeleteInput): Promise<MaencofCrudResult>`
- `MaencofDeleteInput` — `{ path, force?: boolean }`(기본 false). 정본은 `types/mcpCrud.ts`.
- 거부: `{ success: false, path, message(force=true 안내), warnings[](캡 적용) }` / 성공: `{ success: true, path, message: 'Document deleted', warnings?[](요약 1줄) }`.

## Acceptance Criteria

### AC-l1-protected — L1 삭제 금지

- `01_Core/` 문서 삭제 요청은 파일 변경 없이 거부된다.

### AC-backlink-refusal-capped — 거부 경고 상한

- backlink 가 상한을 넘으면 거부 warnings 길이가 `MAX_DELETE_BACKLINK_WARNINGS + 1`(요약 행 포함)이고 마지막 행이 초과 수를 알린다.

### AC-message-no-restate — 경로 재진술 금지

- 성공 message 는 `'Document deleted'` 이며 경로를 되풀이하지 않는다.

## Last Updated

2026-08-05 — 거부 경고 상한·요약 행과 성공 message 계약을 문서화했다 (cross-review FIX-002/FIX-015).
