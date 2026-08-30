# 리뷰 인계 — rule-docs-prune 계획 챌린지 리뷰 (2026-08-30)

> 독립 리뷰어용 자족 문서. 리뷰어는 이 세션의 맥락을 전혀 갖지 않는다. **읽기 전용 리뷰** — 저장소의 어떤 파일도 수정하지 말고, 소견만 돌려준다.

> **상태: SUPERSEDED.** 이 문서는 v1 계획을 세 공급자에게 챌린지 리뷰하던 실행 전 스냅샷이다. 리뷰 뒤 같은 arm 경로와 원장이 v2 실행 산출물로 갱신됐으므로 아래 수치·현재형 문장은 역사적 맥락으로만 읽는다. 현행 정본은 [v2 계획](./2026-08-30-plan-r4-prune.md)과 [실행 결과](../results/2026-08-30-r4.md)다.

## 1. 범위 (무엇을 리뷰하는가)

작업 디렉터리: 이 저장소(ogham 모노레포) 루트. 이 문서를 인계하던 당시 리뷰 대상은 아직 적용되지 않은 **계획**과 그 계획이 채택하려던 **후보 규칙 문면**이었고, templates는 무변경이었다.

- 계획: `.metadata/rule-bench/records/2026-08-30-plan-r4-prune.md` (§0 전역 제약 · §1 근거 · §2 판정 기준 · §3 파일 지도 · §4 규칙별 판정 · §5 태스크 T0/T5/T1–T4/T6/T7 · §7 결정 D1–D6 · §9 리뷰 판정 · §10 "더 뺄 수 있는 항목" 근거표)
- 후보 A — `arms/R4` (`.metadata/rule-bench/arms/R4/`, 14종): 보수적 정리. 현행 대비 전체 −10.3%, 상시 로드 −12.5%.
- 후보 B — `arms/R5` (`.metadata/rule-bench/arms/R5/`, 10종): 기준의 문자 그대로 적용. 4종 은퇴(`seiri_naming`·`seiri_structure`·`seiri_context-efficiency`·`seiri_cognitive-discipline`) + 3종 추가 축약. 전체 −30.6%, 상시 −38.2%.
- 현행(기준선): `plugins/seiri/templates/rules/*.md`(10종), `plugins/filid/templates/rules/*.md`(4종). `.metadata/rule-bench/arms/R3c/`가 현행의 2026-08-30 스냅샷(바이트 동일). 주의: 08-02 채택본 `arms/R3/`는 이후 커밋으로 `seiri_code-comments`·`filid_module-documents`·`filid_code-placement`가 현행과 다르다 — 계획은 리뷰 중 이 점을 발견해 기준선을 R3c로 고쳤다(계획 T7).
- 게이트 원장: `.seiri/tasks/rule-docs-prune/gates.md` (27개 게이트, 전부 미충족 — 실행 전)

diff를 보는 방법: `for f in .metadata/rule-bench/arms/R5/*.md; do b=$(basename "$f"); p=plugins/seiri; case $b in filid_*) p=plugins/filid;; esac; diff -u "$p/templates/rules/$b" "$f"; done` (R4도 동일).

## 2. 원 요구 (사용자 발화 verbatim)

1차:

> /Users/Vincent/Workspace/ogham/plugins/seiri/templates/rules 와 /Users/Vincent/Workspace/ogham/plugins/filid/templates/rules 에서 규칙 파일에 해당하는 것에 대해서, 불필요한 내용을 제거하는 작업을 계획해보고자 한다. 특히, 상위 모델로 발전함에 따라, 세한 지시보다는 자율에 맡기는 작업이 더 높은 성능을 보이는 것을 고려하여, 이 모델이 잘 하는 작업은 제외하고 규칙에서 명시하는 것이 명확한 방향성이나 차별점을 가지는 경우에만 남겨두려고 한다. 이들 규칙은 기본적으로 각각이 소속된 플러그인의 스킬과 상호작용을 하도록 되어있으므로, 이 점을 고려해서 개선점을 파악해보아라.

2차(계획 리뷰 요청):

> 계획 리뷰를 진행해봐. 단, 이건 rule 개편이므로, 수정 후 벤치마크가 더 중요할 수도 있겠다. 그런데, 모델이 이미 잘해서 제외해도 되는 항은 없는건가?

사용자 결정(리뷰 시점): 벤치(T7 Stage A)를 채택 게이트로 격상; R4/R5 선택(D6)은 벤치 결과를 본 뒤 결정.

## 3. 계획이 기대는 설계 정본 (리뷰어가 대조해야 할 문서)

- `.metadata/seiri/01-CONSTITUTION.md` (원칙 P1–P5, L4 인식론 — B5 형식 근거 문장의 출처)
- `.metadata/seiri/02-ARCHITECTURE.md` "규칙과 스킬의 경계"·"할당 원리"·"베팅의 판정" (규칙=판정 기준 what / 스킬=절차 how; "인지 부재가 곧 실패 원인"인 조항은 규칙에 남긴다는 원칙)
- `.metadata/seiri/03-RULES.md` (상용구 B1–B9, 규칙별 판정 노트)
- `.metadata/seiri/phase0/SYNTHESIS.md` (D8 "규칙 무삭감" 결정과 그 5가지 근거, "D7 실측 후 재검토 가능")
- `.metadata/seiri/phase0/d9-results.md` (프로세스 규칙 A/B 리프트 0), `phase0/d7-election-results.md` (strict 선출 13/15), `phase0/d7-gen5-results.md`
- `.metadata/rule-bench/README.md` (규칙 개정 게이트 1–4, 실측 KEEP 코어, 한계), `results/2026-08-01-r2.md`, `results/2026-08-02-stage3-4.md` (opus 리프트 0 등)
- 기계 검사: `plugins/seiri/src/__tests__/ruleInvariants.test.ts`, `plugins/seiri/src/__tests__/size.test.ts`, `plugins/filid/src/__tests__/unit/core/ruleDocInvariants.test.ts`
- 규칙↔스킬 결합 지점: `plugins/seiri/skills/*/SKILL.md`(특히 implement·verify·trace-cause·receive-review·execute·request-review), `plugins/filid/skills/cross-review/contracts.md`(`filid_fractal-boundaries §6`·`filid_verification-records §3` 인용), `plugins/filid/skills/cross-review/reviewers/verification.md`, `plugins/filid/skills/.shared/intent-template.md`·`detail-template.md`, `plugins/filid/src/core/rules/ruleEngine/DETAIL.md`(`seiri_public-contract §1` 인용), `plugins/seiri/src/constants/electionLines.ts`(훅이 주입하는 선출 계약)

## 4. 구속 규칙 (리뷰 자체에 적용)

이 저장소의 `.claude/rules/seiri_*.md`·`filid_*.md`(현행 14종)가 세션에 로드된다. 특히 `seiri_cognitive-discipline`(증거 없는 주장은 예측; 주장마다 도구 출력 인용)과 `seiri_reuse-first` §3(수술적 변경)을 리뷰 소견에 적용할 것 — 소견은 `file:line` 또는 도구 출력을 인용한다.

## 5. 알려진 위험 (저자가 가장 확신하지 못하는 것)

1. **프로세스 규칙(test-validity·context-efficiency·cognitive-discipline)의 장기세션·컴팩션 체제 가치는 어떤 벤치도 재지 못했다.** 단일샷 벤치는 표적 모델(opus)에서 10이슈 전부 포화. 삭제·은퇴는 정책 결정이며, 저장소의 기존 문서(SYNTHESIS D8, README 한계)는 "포화를 삭제 근거로 쓰지 말라"고 적어 두었다. 계획은 이를 "D7 실측(13/15)으로 D8의 전제가 해소됐다"는 논리로 넘는다 — 이 논리가 타당한가?
2. **남긴 S1(agent-legible)·S2(public-contract)의 근거는 gen-4 실측(Phase 0 반전)이다.** gen-5는 포화 계기(iA·iB)뿐이고 고감도 변형(iK·iL)은 haiku만 측정했다. 계획은 T7 Stage B로 이를 측정하려 한다.
3. **R5는 4종을 은퇴시킨다.** 02-ARCHITECTURE "할당 원리"는 reuse-first처럼 "인지 부재가 곧 실패 원인"인 조항을 규칙에 남기라고 하는데, R5는 reuse-first §1을 한 문장으로 줄이고 naming을 은퇴시킨다. 설계 원칙과의 충돌인지, 실측(iC·iD 상위 모델 포화)이 원칙을 갱신하는지 판단이 필요하다.
4. **규칙 본문에 `/seiri:<name>` 스킬 포인터를 넣는다**(D4). 02-ARCHITECTURE는 "규칙→스킬 단방향·이름만"을 허용하지만 현행 규칙에는 없던 형태다. 플러그인 없는 저장소에서 dangling 이름이 되는 비용 vs 스킬 단일 소유의 이득.
5. **B5 형식 근거 문장 14개를 배포 문면에서 manifest `grounding` 필드로 옮긴다**(T4, D1). 01-CONSTITUTION L4의 canon을 배포물에서 빼는 것이라 헌법 개정 성격.
6. T5 가드 테스트 코드는 작성만 되고 실행되지 않았다(리뷰 규칙: 읽기만). TypeScript 타입 문제 가능.
7. 벤치 하네스 selftest가 Node 24에서 깨져 있다(기본 리포터 `spec` → TAP 파싱 실패). T0이 한 줄로 고친다. 08-02 결과의 "selftest 12/12"는 구 Node 기준.
8. 규칙 문면 압축 과정에서 **의미 드리프트**가 있을 수 있다. R4/R5는 헤더 blockquote·footer·표가 현행과 바이트 동일함만 기계 검사했고, 본문 산문의 의미 보존은 검사하지 못했다.

## 6. 검증 명령 (리뷰어가 재현할 수 있는 것)

- 후보 불변식·인용 해석·바이트: `node .metadata/rule-bench/verify-arm.mjs R4` → `R4_INVARIANTS_OK`; `node .metadata/rule-bench/verify-arm.mjs R5` → `R5_INVARIANTS_OK`
- 현재 스위트 기준선: `yarn seiri test:run` → `Tests 268 passed`; `yarn filid test:run` → `Tests 1030 passed | 7 skipped`
- 벤치 selftest 상태(T0 전): `node .metadata/rule-bench/grade.mjs --selftest; echo $?` → exit 1; `NODE_OPTIONS='--test-reporter=tap' node .metadata/rule-bench/grade.mjs --selftest iA iC iE iJ` → 전부 `"correct":true`
- 원장 파싱: `mcp__plugin_seiri_tools__gates({ action: "status", task: "rule-docs-prune" })` (Claude 세션에서만)

## 7. 리뷰어에게 묻는 것 (소견을 사전 판정하지 않는다)

1. 계획 §2의 4분류 기준(K-방향/K-사실/D-기본기/S-스킬중복)이 건전하고, §4·§10의 조항별 처분에 **일관되게** 적용됐는가? 근거가 없거나 설계 정본과 충돌하는 처분을 `파일:절` 단위로 지목하라.
2. 규칙↔스킬 결합의 열거(계획 §1 "실체")에 빠진 의존이 있는가? (훅 주입 문구, 스킬의 인용, 테스트 계약, 문서 인용, 다른 플러그인의 참조)
3. R4·R5 본문에서 현행 대비 **의미가 바뀐** 문장이 있는가? 압축이 아니라 변경인 지점을 diff 줄로 인용하라.
4. T7 벤치 설계(Stage A 회귀 가드 / Stage B 표적 모델 기본기 프로브 / Stage C 정보용, 사전 기준)가 D6(R4 vs R5)과 R6(S1·S2 추가 은퇴)을 판단하는 데 충분한가? 계기·표본·기준의 결함을 지적하라.
5. T3b(4종 은퇴)·T4(B5→manifest)·T5(인용 가드 테스트)·T6(3면 동기화)의 절차에 빠진 단계나 깨질 소비자가 있는가?
6. 종합 판정: `cleared` / `rework-required` 중 하나와, rework라면 우선순위가 붙은 소견 목록.

출력 형식: 소견마다 `심각도(error|warning|note) · 대상(파일:절 또는 계획 §) · 소견 한 문장 · 근거 인용`. 마지막에 종합 판정 한 줄.
