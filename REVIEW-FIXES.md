# 코드리뷰 수정 계획 — `@ogham/http-kit` 추출 커밋

대상 리뷰: `249e0151` (feat(http-kit): extract shared body runtime; cap parseBody size)
지적 15건. 설계 근거·검증 결과는 이 문서에, 한 줄 진행 기록은 `.metadata/local-server-security/http-kit-ledger.md` 에 남긴다.

## 전역 제약 (모든 task 상속)

- TypeScript ^5.7 · Node ≥ 20 · ESM. 테스트는 Vitest.
- `shared/http-kit` 은 `private: true` 워크스페이스 — 소비처는 서브패스 deep import
  (`@ogham/http-kit/body`, `/html`, `/response`)만 사용하고, esbuild `external` 배열에 넣지 않는다.
- 인용 문자 규약은 파일별 기존 스타일 유지 (filid·imbas·cennad·seiri = single quote, 그 외 double quote).
- 단문 제어문은 중괄호 없이 (`curly: ["warn","multi"]`).
- `bridge/`·`public/` 재생성은 검증 목적으로만 실행하고 커밋은 사용자가 한다.
- INTENT.md 는 50줄 캡, 섹션 헤딩은 영어.

## 결정 사항 (리뷰 권고와 다른 선택 포함)

1. **기본 상한은 1 MB 로 되돌린다** (10 MiB → `1_000_000`). seiri·filid·imbas·entrez 가
   커밋 전 강제하던 값이고, 네 곳 호출부가 모두 인자 없이 호출하므로 기본값 복원이
   호출부 4곳 수정보다 작다. cennad·atlassian 은 원래 무제한이었으므로 1 MB 는 강화.
   deilen 만 명시 상한(`max_payload_mb`)을 그대로 쓴다.
2. **초과 시 소켓을 끊지 않는다 — drain 후 reject.** `req.destroy()` 를 응답 전에
   호출하면 413 이 전달되지 않고(지적 2), 반대로 data 리스너를 붙인 뒤 남은 바이트를
   버리지 않으면 keep-alive 파이프라인이 오염된다. deilen `utils/parseMultipart.ts`
   의 `readBody` 가 이미 이 설계를 주석으로 문서화해 둔 정본이므로 그것을 따른다.
   Content-Length 선검사 경로는 리스너를 붙이지 않아 Node 가 `_dump()` 로 배수한다 —
   메모리는 상한 안이고 연결은 재사용 가능. "소켓을 끊어 스트리밍을 중단시킨다"는
   기존 docstring·INTENT 문구는 사실이 아니므로 함께 정정한다.
3. **에러→상태 매핑을 `describeBodyError` 로 승격한다.** 동일 ladder 가 5곳에 복제돼
   413/500/400 세 갈래로 갈렸다(지적 12). 상태와 메시지만 반환하고 응답 envelope
   (`{success}`/`{ok}`)는 호출자가 유지한다 — `response/INTENT.md` 경계 유지.
4. **deilen 은 두 본문 경로를 413 으로 통일한다.** multipart 초과도
   `RequestTooLargeError`(선택적 message 인자 추가)로 던져, 같은 서버 안에서
   `handleGetImage` 의 413 과 어긋나지 않게 한다. multipart 의 의미 검증 실패
   (mime·payload 누락 등)는 400 유지.
5. **`res.headersSent` 가드를 6개 라우터 onError 에 넣는다.** deilen `routing/routes.ts`
   가 이미 가진 패턴. 지적 6이 지목한 곳은 atlassian·entrez 지만, 동일 코드가
   cennad·filid·imbas·seiri 에도 있어 같은 크래시 경로를 공유한다.
6. **번들 재생성(지적 5)은 검증까지만.** `bridge/mcp-server.cjs` 7개는 이전 커밋
   상태이므로 `build:all` 로 재생성해 새 코드가 인라인되는지 확인하고, 커밋은 사용자에게
   남긴다. `.metadata/local-server-security/README.md` §8 의 검증 문구는
   근거가 되지 못하므로(누출 0 은 import 없는 번들에서 자명) 정정한다.

## Task 1 — http-kit 코어 (지적 1·2·3·4·6·11·13)

| 파일                                             | 책임                                                       |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `shared/http-kit/src/html/escapeJsonForHtml.ts`  | `$` 이스케이프 추가 (`$`)                             |
| `shared/http-kit/src/body/parseBody.ts`          | 기본 1 MB · drain-후-reject · 버퍼 조기 해제 · docstring   |
| `shared/http-kit/src/body/describeBodyError.ts`  | 신규 — `describeBodyError(err) → {status, message}`         |
| `shared/http-kit/src/body/index.ts`              | 배럴에 `describeBodyError` 명시 추가                       |
| `shared/http-kit/src/response/sendJson.ts`       | `JSON.stringify` undefined → `"null"`                      |
| `shared/http-kit/src/body/INTENT.md`             | Purpose·Conventions·Boundaries 계약 정정                    |

1. `escapeJsonForHtml.ts` — `ESCAPE_BY_CHARACTERS` 에 `"$": "\\u0024"` 추가.
   `$` 는 문자 클래스 안에서 리터럴이므로 파생 정규식은 그대로 안전하다.
   근거: 7개 소비처 중 6곳이 결과를 `String.prototype.replace` 의 **문자열** 치환
   인자로 넘겨 `$'`·` $\`` `·`$&`·`$$` 가 치환 패턴으로 해석된다.

2. `parseBody.ts` —
   - `MAX_BODY_BYTES = 1_000_000`.
   - data 핸들러: 초과 시 `tooLarge = true; chunks.length = 0;` 후 **계속 수신**
     (바이트는 버림). `req.destroy()` 삭제. reject 는 `end` 에서 한 번.
   - 정상 경로: `chunks.length === 1 ? chunks[0] : Buffer.concat(chunks)` 로
     불필요한 복사 1회 제거, 디코드 직후 `chunks.length = 0`.
   - docstring: 선검사/누적 두 계층과 "끊지 않고 배수한다"를 명시.

3. `describeBodyError.ts` —
   ```ts
   export function describeBodyError(err: unknown): {
     status: number;
     message: string;
   };
   ```
   `RequestTooLargeError → {413, "Request body too large"}`,
   `SyntaxError → {400, "Invalid JSON body: <원문>"}`,
   그 외 `{500, err.message ?? "Internal server error"}`.
   기존 소비처가 쓰던 문자열을 그대로 재현해 사용자 노출 문구를 바꾸지 않는다.

4. `sendJson.ts` — `const text = JSON.stringify(body) ?? "null";`
   (`undefined`·함수·심볼 body 에서 `Buffer.byteLength` 가 던지던 TypeError 제거.)

### Task 1 테스트 (fail-first 확인 대상)

| 파일                                                            | 케이스                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| `shared/http-kit/src/body/__tests__/parseBodyServer.test.ts`     | 신규 — 실제 `http.createServer` + 소켓 2계층                |
| `shared/http-kit/src/body/__tests__/parseBody.test.ts`           | destroy 단정 → drain 단정, 기본 상한 1 MB                  |
| `shared/http-kit/src/body/__tests__/describeBodyError.test.ts`   | 신규 — 3분기                                                |
| `shared/http-kit/src/html/__tests__/escapeJsonForHtml.test.ts`   | `$` 4종 + `replace()` 치환 인자 회귀                        |
| `shared/http-kit/src/response/__tests__/sendJson.test.ts`        | `undefined` body                                            |

`parseBodyServer.test.ts` 는 chunked(Content-Length 없음) 초과 POST 에서 **클라이언트가
413 을 수신**하는지 확인한다 — 수정 전에는 소켓이 끊겨 응답이 도달하지 않으므로 red.

## Task 2 — 소비처 재배선 (지적 5·7·8·9·12)

| 파일                                                                              | 변경                                                      |
| --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `plugins/{cennad,filid,imbas}/src/.../handlers/handleSave.ts`                      | ladder → `describeBodyError`                               |
| `plugins/seiri/src/.../handlers/readSaveBody.ts`                                   | ladder → `describeBodyError`                               |
| `plugins/seiri/src/.../routing/routes.ts`                                          | sync 핸들러 try/catch 가드 + `headersSent`                  |
| `plugins/{cennad,filid,imbas}/src/.../routing/routes.ts`                           | onError `headersSent` 가드                                  |
| `plugins/atlassian/src/.../webServer/handlers/handle{Submit,Test}.ts`              | 본문 읽기 지점에서 `describeBodyError`                      |
| `plugins/atlassian/src/.../webServer/routes.ts`                                    | 라우트 ladder 제거(핸들러로 이동) + `headersSent`           |
| `plugins/entrez/src/.../webServer/handlers/handle{Submit,Test}.ts`                 | 본문 읽기 try/catch 신설 → 413/400                          |
| `plugins/entrez/src/.../webServer/routes.ts`                                       | onError `headersSent` 가드                                  |
| `plugins/deilen/src/.../handlers/handlePostFeedback.ts`                            | 413/400 분기 + prettier 정렬(지적 15)                       |
| `plugins/deilen/src/.../utils/parseMultipart.ts`                                   | 초과 시 `RequestTooLargeError`                              |
| `plugins/deilen/src/.../__tests__/feedbackFlow.test.ts`                            | multipart 초과 400 → 413                                    |
| `plugins/cennad/src/.../__tests__/webServer.test.ts`                               | "10 MB" 문구·본문 크기 → 1 MB 기준                          |

인터페이스: Task 1 이 `describeBodyError`(위 시그니처)와 `RequestTooLargeError(message?)`
를 공개하고, Task 2 는 그 두 심볼만 소비한다.

## Task 3 — 검증 배선 (지적 10·11·14)

- `vitest.config.ts` `projects` 에 `./plugins/seiri`·`./plugins/entrez` 추가.
- `shared/http-kit/tsconfig.json` `exclude` 에서 `src/**/__tests__/**` 제거
  (빌드 산출물은 `tsconfig.build.json` 이 아니라 별도 `exclude` 로 유지 — dist 오염 방지).
- `scripts/typecheckAll.mjs` — provider 를 build 후 `typecheck` 까지 실행.

## Task 4 — 문서

- `shared/http-kit/src/body/INTENT.md` (Task 1 에 포함), `src/INTENT.md` Structure 표에
  `describeBodyError.ts` 반영.
- `.metadata/local-server-security/README.md` §8 검증 문구 정정 + 후속 항목 기록.
- `.metadata/local-server-security/http-kit-ledger.md` 진행 한 줄 추가.

## 검증 (완료 주장 전 실행)

```bash
yarn typecheck                      # 전 워크스페이스 (provider typecheck 포함)
yarn test:run                       # 루트 projects (seiri·entrez 포함)
yarn build:all                      # bridge 재생성 — 새 코드 인라인 확인
yarn prettier --check <변경 파일>
```

추가로 `grep -c 1000000 plugins/*/bridge/mcp-server.cjs` 로 새 상한이 번들에
들어갔는지, `grep -c 'u0024' plugins/*/bridge/mcp-server.cjs` 로 이스케이프 수정이
번들에 반영됐는지 확인한다.

## 범위 밖 (의도적 미실행)

- `bridge/`·`public/` 커밋 — 저장소 관례상 사용자 몫.
- eslint `no-restricted-syntax`(`req.on("data"` 금지)·번들러 `external` 가드 —
  지적 12의 근본 예방책이지만 소비처 계약 수정과 독립적이라 별도 제안으로 남긴다.
