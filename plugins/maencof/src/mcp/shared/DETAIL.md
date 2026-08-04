# mcp/shared — Contract

## Requirements

- MCP 도구 전체가 공유하는 응답 포맷과 backlink 인덱스 유틸을 소유한다. 도구 특화 로직은 두지 않는다.
- `toolResult` 는 결과를 **compact JSON**(`JSON.stringify(result, mapReplacer)` — 들여쓰기·개행 없음)으로 직렬화해 MCP `content[{type:'text'}]` 로 감싼다. 응답은 LLM 컨텍스트로 들어가므로 포맷 개행·들여쓰기가 곧 토큰 비용이다.
- `mapReplacer` 는 `Map`→객체, `Set`→배열 변환으로 직렬화 불가 컬렉션을 보존한다.
- `toolError` 는 `Error: <message>` 텍스트와 `isError: true` 를 담는다 — 에러 문자열은 JSON 이 아니다.
- `backlinks` organ 은 `.maencof-meta/backlink-index.json` 의 조회(`getBacklinks`)·제거(`removeBacklinks`)를 소유한다. 빈 배열이 된 키는 인덱스에서 삭제한다.

## API Contracts

- barrel `index.ts` — `toolResult(result: unknown)` · `toolError(error: unknown)` · `mapReplacer` · `getBacklinks(vaultPath, path)` · `removeBacklinks(vaultPath, path)`.
- `toolResult` 반환: `{ content: [{ type: 'text', text: <compact JSON> }] }` / `toolError` 반환: `{ content: [{ type: 'text', text: 'Error: …' }], isError: true }`.

## Acceptance Criteria

### AC-compact-serialization — compact 직렬화

- `toolResult` 의 `text` 는 들여쓰기·불필요 개행 없는 compact JSON 이며 `JSON.parse` 로 원형 복원된다.

### AC-map-set-preserved — 컬렉션 보존

- 결과에 든 `Map`/`Set` 이 각각 일반 객체/배열로 직렬화된다.

### AC-error-envelope — 에러 봉투

- `toolError` 는 어떤 입력이든 `isError: true` 와 사람이 읽을 메시지를 담는다.

## Last Updated

2026-08-05 — compact JSON 직렬화 계약을 문서화했다 (cross-review FIX-008).
