# @ogham/http-kit 추출 — 진행 원장

> 계획: `http-kit-plan.md`. 한 줄/완료 task — 무엇이·어디에·어떻게 검증됐는지.
> compaction 후에는 이 원장 + git 을 기억보다 신뢰한다.

| Task                          | 상태       | landed                                                                                                                             | 검증                                                                                                                                                                                    |
| ----------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 패키지+organ+테스트         | 완료       | shared/http-kit (인프라5+소스10+INTENT5)                                                                                           | test:run 17 pass · build dist emit(4 서브패스 .d.ts) · typecheck OK                                                                                                                     |
| 2 배선(PROVIDERS×2+vitest)    | 완료       | buildAll/typecheckAll PROVIDERS + vitest projects (파일 rename 반영)                                                               | yarn typecheck: provider 4빌드 + consumer 10 clean                                                                                                                                      |
| 3 seiri 전환                  | 완료       | 소비처7 import교체·utils/ 삭제·ContentType.JSON 제거·INTENT                                                                        | typecheck OK · test:run 102 pass                                                                                                                                                        |
| 4 imbas 전환                  | 완료(위임) | 소비처 import·utils 3삭제·INTENT Structure; Deps(http-kit)는 내가 추가                                                             | 에이전트: typecheck 0 · test:run 293 pass · 무회귀                                                                                                                                      |
| 5 filid 전환                  | 완료(위임) | 소비처 import·utils 3삭제·INTENT Structure; Deps(http-kit)는 내가 추가(줄수 캡 대응 node:http 병합)                                | 에이전트: typecheck 0 · test:run 1202 pass · 무회귀                                                                                                                                     |
| 6 cennad 전환(취약점)         | 완료       | 소비처6 import·handleSave 413분기 신설·utils/ 삭제·INTENT·413테스트                                                                | fail-first red(413 branch 제거→400) 확인 후 복원 · typecheck OK · test:run 610 pass                                                                                                     |
| 7 atlassian 전환(취약점)      | 완료       | 소비처6 import·routes.handleError 413분기·utils 3삭제·escapeJsonForHtml.test.ts 삭제(정본이관)·INTENT utils+deps·413테스트         | fail-first red(413 branch 제거→500) 확인 후 복원 · typecheck OK · test:run 377 pass                                                                                                     |
| 8 entrez 전환                 | 완료(위임) | 소비처 import·utils 3삭제·INTENT Structure·utils.test.ts escape describe 제거(정본이관)                                            | 에이전트 보고: typecheck 0 · test:run 179 pass; charset/에러타입 무회귀 확인                                                                                                            |
| 9 deilen 전환(multipart 유지) | 완료(위임) | 소비처16 import(sendJson12·escape2·parseJsonBody→parseBody2)·utils 3삭제(multipart 등 7종 유지)·INTENT Structure+Deps(인라인 병합) | 에이전트: typecheck 0 · test:run 125 pass · 무회귀                                                                                                                                      |
| 10 전체 검증+문서             | 완료       | README §8 추가 · 원장 마감                                                                                                         | typecheck clean(prov4+cons10) · 루트 test:run 4516 pass +seiri102 +entrez179 · build:all 성공 · bridge inline 누출 0                                                                    |
| 11 리뷰 15건 반영             | 완료       | http-kit 코어 4파일+describeBodyError 신설 · 소비처 7플러그인 16파일 · 배선 3(vitest·tsconfig·typecheckAll) · README §8 정정       | fail-first red(chunked 초과 POST → ECONNRESET) 확인 후 green · typecheck clean(prov3+cons10) · 루트 test:run 4808 pass · build:all 후 7번들에 `1e6`·`$`·413 각 1건, `req.destroy()` 0건 |

## 편차 기록 (deviation log)

- **스크립트 rename**: 계획이 참조한 `scripts/build-all.mjs`·`typecheck-all.mjs`
  는 repo 의 kebab→camelCase 전환으로 `buildAll.mjs`·`typecheckAll.mjs` 로 개명됨
  (CLAUDE.md 변경과 일치). 개명된 실제 파일 PROVIDERS 에 http-kit 등록.
- **INTENT Dependencies 통일**: 위임 task 를 "Structure 만 갱신"으로 줘 filid·entrez
  에이전트가 Deps 를 안 건드림. 정확성·일관성(cennad·atlassian 은 Deps 에 http-kit
  기재)을 위해 filid·entrez INTENT Deps 에 http-kit 을 내가 추가. filid 는 50줄 캡
  경계(49줄)라 `node:http`를 http-guard 줄에 병합해 줄수 유지하며 추가. deilen 은
  위임 task 에 Deps 추가 명시. imbas 는 완료 후 확인.
- **리뷰 라운드 편차**: (a) 기본 상한 유지 대신 10MB→1MB 복원 — 호출부 4곳을
  고치는 것보다 작고, seiri·filid·imbas·entrez 의 커밋 전 상한을 그대로 되살린다.
  (b) 리뷰는 Content-Length 계층에 `Connection: close` 를 권했으나 `parseBody` 는
  `ServerResponse` 를 받지 않아 채택하지 않고, 두 계층 모두 drain 으로 통일했다
  (Node 가 미소비 요청을 `_dump()` 하므로 메모리는 상한 안, 연결은 재사용 가능).
  (c) `@ogham/cross-platform` 은 provider typecheck 대상에서 보류 — 스펙 파일이
  `normalizeCodexToolUse` 의 `(input: T): T` 선언부 결함으로 이미 red 이고, 그 수정은
  훅 소비처 재확인을 동반하는 별건이다. `typecheckAll.mjs` 주석에 사유 명시.
- **INTENT.md 언어**: 계획 전역제약은 "INTENT.md 영어"였으나, 실제
  `@ogham/http-guard` INTENT.md 선례가 한국어이고 `[filid:lang]=ko` 이므로
  http-kit INTENT.md 본문도 **한국어**로 작성(섹션 헤딩만 영어 — 기계 판독 앵커).
  코드·주석은 영어 유지(http-guard 동일).
