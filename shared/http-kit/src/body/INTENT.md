## Purpose

로컬 HTTP 서버가 받는 요청 본문을 크기 상한 안에서 읽어 JSON 으로 파싱한다. 헤더(Content-Length)는 발신자가 조작할 수 있으므로 선언값과 실제 수신 바이트를 모두 검사하고, 초과분은 버리면서 요청을 끝까지 배수해 호출자가 413 을 실제로 전송할 수 있게 한다.

## Structure

| File                   | Role                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| `parseBody.ts`         | `parseBody(req, maxBytes?)` + `MAX_BODY_BYTES` + `RequestTooLargeError` |
| `describeBodyError.ts` | 거부 사유 → `{status, message}` (413 · 400 · 500)                       |
| `index.ts`             | barrel                                                                  |

## Conventions

- 이중 방어: Content-Length 선검사 → 수신 바이트 누적 검사.
- 초과 시 소켓을 끊지 않는다 — 버퍼를 비우고 끝까지 배수한 뒤 `RequestTooLargeError` 로 reject. destroy 는 호출자의 413 을 전달 불가로 만들고, 중도 포기는 keep-alive 연결에 미파싱 바이트를 남긴다.
- 빈 본문은 `{}` 로 resolve; JSON 파싱 실패는 원본 에러로 reject.
- 상태 매핑은 `describeBodyError` 한 곳 — 소비처는 응답 envelope 만 소유.
- `maxBytes` 기본 1MB; 더 큰 본문을 받는 소비처가 명시 상한을 주입.

## Boundaries

### Always do

- 모든 본문을 `maxBytes` 상한 안에서 파싱.
- 초과 시 배수 후 `RequestTooLargeError` reject.

### Ask first

- 기본 상한·반환·거부 계약 변경 (다중 소비자).

### Never do

- 상한 없는 무제한 버퍼링.
- 응답 전 소켓 destroy.
- 함수 내부에서 응답 전송 (거부는 reject 로만, 응답은 호출자 책임).

## Dependencies

- `node:http` (`IncomingMessage`).
