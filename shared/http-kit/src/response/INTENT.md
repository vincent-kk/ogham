## Purpose

로컬 HTTP 서버의 JSON 응답을 한 형태로 통일해 전송한다. status, charset 명시 Content-Type, 정확한 Content-Length 를 함께 써서 멀티바이트 본문도 브라우저가 올바로 해석하게 한다.

## Structure

| File          | Role                                            |
| ------------- | ----------------------------------------------- |
| `sendJson.ts` | `sendJson(res, status, body)` — writeHead + end |
| `index.ts`    | barrel                                          |

## Conventions

- Content-Type 은 항상 `application/json; charset=utf-8`.
- Content-Length 는 `Buffer.byteLength` (문자 길이 아님) — 멀티바이트 정합.
- 응답 본문 형태(`{ success }`/`{ ok }` 등)는 호출자가 결정 — 본 함수는 직렬화·전송만.

## Boundaries

### Always do

- charset 포함 Content-Type + 정확한 Content-Length 전송.

### Ask first

- Content-Type·헤더 형태 변경 (다중 소비자 계약).

### Never do

- 문자 길이를 Content-Length 로 사용 (멀티바이트 깨짐).
- 응답 본문 스키마를 본 함수에 하드코딩.

## Dependencies

- `node:http` (`ServerResponse`), `node:buffer` (`Buffer`).
