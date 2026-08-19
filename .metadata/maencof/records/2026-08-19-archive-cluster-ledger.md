# 진행 원장 — archive-cluster 실행 (2026-08-19)

플랜: [2026-08-19-archive-cluster-plan.md](./2026-08-19-archive-cluster-plan.md) (rev.2, verdict cleared)
규칙: 태스크별 커밋 · fail-first · 문서 선행 · 완료 태스크는 재수행 금지.

| 태스크              | 상태 | 산출/검증                                                                                                                                                                                                                              |
| ------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T0 설계 정본        | 완료 | `00bc3376` — 정본 6장 + 플랜/요청서/원장 커밋                                                                                                                                                                                          |
| T1 allowlist+게이트 | 완료 | `bea770f9` — red 19건→green, 전체 158 pass, typecheck 0                                                                                                                                                                                |
| T2 cluster_key      | 완료 | red 6건→green, 전체 159 pass, typecheck 0 (quoteYamlValue 무인용 산출로 단언 2건 교정)                                                                                                                                                 |
| T3 collapse+열기    | 완료 | red 5+α→green 22, 전체 160 pass, eval 통과. 발견: 쿼리 캐시 키가 열거식이라 subLayerFilter 누락 → 키에 추가(기존 selectivity 테스트가 검출)                                                                                            |
| T3b lens            | 완료 | `e87e7e18` — cluster 통과 + 상한 후필터(L1 누출 차단), lens 16 파일 green. 편차: graphCache 픽스처 `doc/*`→`02_Derived/*` (T1 게이트 파급)                                                                                             |
| T4 archived 강등    | 완료 | red 2건→green, 전체 161 pass, eval 통과 (P3 실측 0.4→0.12 재현 테스트 포함)                                                                                                                                                            |
| T5 checkup          | 완료 | `344e0904` — D3 예외 3문서 반영, doctorDiagnostics 7건 불변 통과                                                                                                                                                                       |
| T6 골든 2단계       | 완료 | `317fbfcc` — (b1) 픽스처 11건+골든 불변 27쿼리 게이트-활성 eval 통과(격리 기계 증명) → (b2) 골든 2케이스(coverage·succession) + baseline 27→29 재기록(ndcg 0.9758→0.977) 같은 커밋                                                     |
| T7 최종 검증·버전   | 완료 | filid 스캔(신규 finding 4건 → 문구 교정으로 0건, 잔여는 기존분), maencof 0.13.0(`060deb6e`)·lens 0.9.1(`51f6d5ea`) 빌드+bridge 커밋, 훅 번들 가드 통과. 최종 체인: typecheck 0 · maencof 161 파일 pass · eval 통과 · lens 16 파일 pass |

## 수용 기준 최종 대조 (2026-08-20)

1. **유효 frontmatter 문서의 `99_Archive` 그래프 미진입** — 충족. `archiveExclusion.test.ts`(fullBuild 노드 부재) + `knowledgeNodePathGate.test.ts` + `metadataStoreLayerGate.test.ts`(재수화 정화). 사전 red 관측 후 green.
2. **`99_Archive`발 파싱 실패 노이즈 0건** — 충족. 같은 통합 테스트의 `parseFailures` 0 단언.
3. **cluster_key 8건 → top-10 대표 1건 + 접힌 건수 표기** — 충족. `queryCollapse.test.ts`(8건→대표1+collapsedCount 7) + `kgSearchResponse`·`kgContextModes` 표기 케이스 + 골든 `cluster-collapse-coverage`.
4. **archived 시드 후보 상위 배제** — 충족. `archivedDemotion.test.ts` (P3 실측 0.4→0.12 재현, suggest 목록 탈락).
5. **기존 골든셋 ratchet 통과** — 충족. T6(b1): 픽스처 11건 추가·골든 27 불변 상태(게이트 활성)에서 `yarn eval` 통과로 기계 증명. (b2) 후 baseline 29쿼리 재기록(ndcg10 0.9758→0.977, 신규 케이스 고득점 편입).

## 편차 기록

- T1: 기존 테스트 7개 파일의 픽스처 경로를 레이어 경로로 이관(`'a.md'`→`'02_Derived/a.md'` 등, 헬퍼에 mkdir 추가). 사유: allowlist·게이트·역직렬화 필터로 루트/비레이어 경로가 계약상 무효가 됨 — 단언 의미는 불변, 경로만 신계약 준수. 대상: metadataStoreMigration·metadataStoreRehydrate·rebuildAndInvalidate·backgroundRebuildInvalidate·partialReindexHybrid·vaultWalkNoSnapshot·freshnessGuard.
