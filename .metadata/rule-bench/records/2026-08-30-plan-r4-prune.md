# rule-docs-prune — R4/R5/R5p: 자율성 기준 규칙 문서 정리 계획 (v2, 리뷰 반영)

> 2026-08-30. 사용자 결정: "상위 모델은 세세한 지시보다 자율에 맡길 때 성능이 높다 — 이 모델이 잘 하는 작업은 규칙에서 빼고, 규칙이 **명확한 방향성이나 차별점**을 줄 때만 남긴다." 규칙은 각 플러그인의 스킬과 맞물려 있으므로 규칙↔스킬 상호작용을 기준으로 잘라낸다. 리뷰 시점 사용자 결정 2건: 벤치(T7)를 채택 게이트로 격상 · 후보 선택(D6)은 벤치 결과를 본 뒤. v2는 `/cennad:crosscheck` 3건(§9)의 소견을 반영한 재작업본이다. 커밋·버전 범프·릴리즈는 사용자 결정.

한 줄: `plugins/seiri/templates/rules/*.md`(10종)·`plugins/filid/templates/rules/*.md`(4종)에서 (a) 스킬이 그 순간에 나르는 절차, (b) 다른 규칙과 중복되는 조항, (c) **허용 가능한 실측**이 "규칙 없이도 같은 행동"을 보인 조항을 걷어내고, 방향·차별점·모델이 도출할 수 없는 사실만 남긴다. 실측이 없는 삭제는 **정책 암(R5p)**으로 분리해 사용자 선택에 맡긴다.

검증 가능한 목표: (1) 두 플러그인 `test:run` green(rule-invariant·size·D8·신설 인용 가드 포함), (2) 채택 arm == templates == `.claude/rules` == `AGENTS.md` 마커, 은퇴 규칙의 고아 사본 0건, (3) 실측 바이트(§3): R4 상시 −11.2% · R5 −18.4% · R5p −36.2%(T4 채택 시 각 −1.7KB 추가), (4) T7 Stage A 사전 기준을 기계 판정(`judge-stage-a.mjs`)한 결과가 `results/2026-08-30-r4.md`·`.jsonl`에 기록되고 채택 arm이 그 판정을 통과.

---

## 0. 전역 제약 (모든 태스크가 상속 — verbatim)

- **불변식(기계 검사)** — `plugins/seiri/src/__tests__/ruleInvariants.test.ts`, `plugins/seiri/src/__tests__/size.test.ts`, `plugins/filid/src/__tests__/unit/core/ruleDocInvariants.test.ts`:
  - 모든 규칙 파일은 `> **Precedence**:` 로 여는 헤더 blockquote와 `This rule is working if:` + `is wrong for you if:` 쌍을 유지한다. `rests on (a property|properties)` 문장은 T4(D1) 전까지 유지.
  - seiri 산문에 숫자 임계 금지: `\b\d+\s*(lines?|cases?|levels?|chars?|columns?)\b|[<>]=?\s*\d+|\bLCOM\d?\b|\bmax[ -]?depth\b`. 유일 예외 두 문장 **verbatim** — `seiri_function-boundaries.md`: `each helper's implementation body must be 8 lines or fewer; its declaration or signature and enclosing braces do not count`, `seiri_code-comments.md`: `and it stays within 3 lines`.
  - seiri 산문에 러너명 금지: `npm|yarn|pnpm|pytest|cargo|go test|gradle|mvn`.
  - D8 관용구 verbatim(대소문자 무관): `seiri_context-efficiency.md`에 `pays twice`, `seiri_cognitive-discipline.md`에 `fix where it started` — 상대편 `plugins/seiri/skills/trace-cause/SKILL.md`는 무변경. 규칙이 은퇴하면 그 계약 항목만 테스트에서 제거(T3b).
  - 조건부 로드 집합 고정: seiri = `seiri_test-validity.md`만 `paths:`; filid = `filid_module-documents.md`·`filid_verification-records.md`. `globs:` 금지.
  - 각 규칙 ≤200줄. filid는 정확히 4종·전부 `required: true`.
  - 파일은 LF·raw 바이트로 해시된다 — 편집 후 `yarn seiri build:rules` / `yarn filid build:rules`로 `templateHash` 재주입. `.prettierignore`가 `plugins/*/templates/rules/`·`.metadata/rule-bench/`·`AGENTS.md`를 덮으나 `.seiri/tasks/`는 덮지 않는다 — 원장의 CHECK/EXPECT 값에 백틱이 있으면 이중 백틱 스팬으로 감싼다(gates-format 5항; G10·G13이 그 예).
- **§ 인용 안정성** — 번호로 인용되는 절은 번호를 바꾸지 않는다: `filid_fractal-boundaries §6`(`plugins/filid/skills/cross-review/contracts.md`), `filid_verification-records §3`(같은 파일 + `reviewers/verification.md` + `plugins/filid/src/mcp/server/__tests__/legacyToolPayloads.test.ts:346` 주석), `seiri_public-contract §1`(`plugins/filid/src/core/rules/ruleEngine/DETAIL.md:20`), 규칙 간: `seiri_agent-legible` §1·§3, `seiri_naming` §2·§3, `seiri_structure` §3, `seiri_reuse-first` §3, `seiri_context-efficiency` §1, `filid_module-documents` §2·§5·§7. `verify-arm.mjs`가 `.md`·`.ts` 전부를 훑어 해석을 검사한다(§8).
- **filid 대표 문서 결합** — `filid_fractal-boundaries.md` 헤더의 `Companions:` 줄은 훅이 형제 문서를 가리키는 유일한 경로(`plugins/filid/src/hooks/userPromptSubmit/DETAIL.md`) — 유지.
- **규칙 → 스킬 참조는 단방향·이름만**(`.metadata/seiri/02-ARCHITECTURE.md` "규칙과 스킬의 경계"). `@` 링크 금지.
- **경계 소유권** — seiri는 임계·러너를 소유하지 않는다. filid 규칙은 도구(`structure_validate`·`verification_scan`·`restructure_plan`)의 의미론 정의를 겸한다: 표·캡·문법 블록·organ 이름·"consumer **owners**의 LCA를 **계산**한다"·"widening the contract" 금지 같은 의미론 문장은 삭제하지 않는다(리뷰 F-드리프트로 복원됨).
- **증거 허용성(README 개정 게이트 2)** — `.metadata/rule-bench/README.md:42` "포화 이슈의 R0 만점을 삭제 근거로 쓰지 않는다", `:48` "R0 고통과를 프로세스 조항 삭제 근거로 쓰지 않는다". 따라서 이 계획에서 **허용되는 실측**은 설계된 계기의 결과뿐이다: Phase 0 micro-test 대조군(`phase0/SYNTHESIS.md`), D9 2-2 다파일 증상-함정 과제(`phase0/d9-results.md`), d7-gen5 유혹 시나리오 행동층(`phase0/d7-gen5-results.md`), D7-E 선출(`phase0/d7-election-results.md`). 포화 이슈(iA·iB·iD·iE·iF·iG·iI, opus 전 이슈)의 R0 만점은 **삭제 근거로 쓰지 않는다** — §10의 허용성 열이 이를 표시한다.
- **동기화 채널** — templates → `build:rules` → `test:run` → `node .metadata/rule-bench/apply-rules-sync.mjs`(manifest 항목만 갱신; **고아는 지우지 않는다**, `apply-rules-sync.mjs:22`) → 고아 제거(T6) → 3면 바이트 일치.
- **문서 언어** — 규칙 본문은 영어. 계획·원장은 한국어, 식별자·경로·명령·규칙 문면은 verbatim.
- **정직성** — 프로세스 규칙의 장기세션·컴팩션 체제 가치는 어떤 벤치도 재지 못했고(README 한계·SYNTHESIS), 벤치는 스킬 없이 규칙 파일 채널만 잰다(`prepare.mjs:42-52`, README:50) — S-분류(절차→스킬)와 D4(포인터)의 실효는 이 배터리로 검증 불가. 잘라낸 문면은 `arms/R3c`(현행 스냅샷)와 git에 남고, 회귀 관측 시 절 단위로 복원한다.

---

## 1. 근거 — 저장소가 이미 측정한 것과, 그 측정이 허용하는 것

| 증거 | 출처 | 허용성 | 이번 계획에서의 쓰임 |
| --- | --- | --- | --- |
| opus 10이슈 × 3암 전부 만점("리프트 0") | `results/2026-08-02-stage3-4.md`, `2026-08-01-r2.md` | **불허**(포화) | 표적 모델에서 벤치가 R4/R5/R5p를 가르지 못한다는 **계기 한계**의 증거로만 쓴다 |
| sonnet 리프트는 iJ(function-boundaries §1·§3)뿐 | `2026-08-01-r2.md` | 허용(비포화 계기) | `seiri_function-boundaries` 본문 보존 |
| 프로세스 규칙 A/B(S3+S7+S8, sonnet, 증상-함정·거짓-done 순간 도달): **리프트 0** | `phase0/d9-results.md` 2-2 | **허용**(설계된 계기) | S-분류의 근거; R5의 cognitive-discipline 은퇴 근거 |
| 5세대 행동층 22/22(설계된 유혹 시나리오, 스킬 미로드) | `phase0/d7-gen5-results.md` | 허용 | 같은 결론 |
| strict 선출 13/15·오발화 0/12; 메인세션 8/9 + 전이 6/6 | `phase0/d7-election-results.md`, `phase0/b4-results.md` | 허용 | D8 근거 (4)의 부분 해소 — **약 13% 미발화가 남는다** → 규칙에 판정 기준(what)은 남긴다 |
| Phase 0 반전: S1 0/5→5/5, S2 4/5→0/5·5/5→0/5(gen-4) · S5 §3 grab-bag 대조군 0/3 실패 | `phase0/SYNTHESIS.md` | 허용(gen-4) | S1·S2 유지 근거(gen-5는 Stage B로 재측정) · naming §3 기본기 근거(표본 3, 얇음) |
| 앵커(볼드·Ask-yourself) 제거 무회귀, 골격 3줄→1줄 무회귀 | `2026-08-01-r2.md` | 허용 | 이미 잘린 층 — 이번 대상은 그 다음 층 |
| 실측 KEEP 코어: S1 레시피, S2 wildcard 근거, **S4 5단계 리스트**, S5 grab-bag 목록, **S8 합리화표+Red Flags**, filid 표·캡·문법 | `README.md:42` | — | R4는 S8 **합리화표를 삭제**한다(D3 — README와의 명시적 이탈, 사용자 결정); R5p는 S5 목록도 은퇴시킨다(정책). 그 외는 전 암 보존 |

**D8 "규칙 무삭감"(SYNTHESIS.md:43)의 다섯 근거에 대한 이 계획의 입장** — 리뷰 소견(codex P1-9·claude 3)에 따라 근거별로 답한다:

1. *규칙 = 인지 부재 시 안전망, 스킬 = 인지 작동 시 절차 백스톱; trim은 삼분법 오분류* — R4의 S-분류는 **판정 기준(what)을 규칙에 남기고 절차(how)만 스킬에 둔다**(02-ARCHITECTURE "규칙=판정 기준/스킬=절차" 표와 정합). 안전망은 남는다. R5의 cognitive-discipline **전체 은퇴**는 (1)을 넘어서는 정책이며, 그 근거는 허용 실측(D9 2-2·gen5 행동층)이다.
2. *상시 예산은 이미 작다* — 무관: 이번 삭제는 예산이 아니라 자율성 정책이 동기다.
3. *스킬 2KB 캡이라 trim은 삭제가 된다* — 캡은 4KB로 상향됐고(`budgets.ts`), 옮길 절차는 이미 스킬에 있다(`implement`·`verify`·`trace-cause`). 스킬에 없는 두 문장(변조 프로브·raw-tool/래퍼 구분)은 **규칙에 남긴다**(test-validity §2 전 암 유지 — claude 소견 9 수용).
4. *스킬 발화 미검증* — D7-E로 부분 해소(13/15). 잔여 13%는 (1)의 "what 잔류"가 받는다.
5. *배포 규칙은 플러그인 없는 협업자에게도 닿는다* — R4는 판정 기준을 남기므로 이식 손실이 없다. R5·R5p의 은퇴는 이 손실을 **명시적으로 수용하는 정책**이며 T3b가 설계 정본(01-CONSTITUTION:53·02-ARCHITECTURE:303)을 함께 개정한다.

**02-ARCHITECTURE.md:303 "연속 구속(naming·structure 류)은 규칙"** — 할당 원리는 "규칙 vs 스킬"을 가르는 원리이지 "존재 여부"를 정하지 않는다. R4는 두 규칙을 규칙으로 **유지**(압축)한다. R5p의 은퇴는 존재 여부에 대한 정책 결정이고, 채택 시 이 조항을 개정한다(T3b 4항).

**규칙↔스킬 상호작용의 실체(이번 세션 실측)** — seiri 스킬은 규칙을 이름으로 인용하지 않는다. 결합은 (i) D8 관용구 2개(기계 검사), (ii) 훅 주입 줄(`electionLines.ts`·`activeRulesLine.ts`), (iii) `execute` §5·`request-review` Rules "위임자에게 규칙 파일 이름을 넘겨라"(`execute/SKILL.md:27`, `request-review/SKILL.md:28`). 내용 중복: `test-validity` §1↔`implement`·`trace-cause` / §2 일부↔`verify`(`verify/SKILL.md:19`) / `cognitive-discipline` §1↔`verify`, §2↔`trace-cause`, §5↔`receive-review` / `context-efficiency` §2↔`trace-cause` / `reuse-first` §4↔`implement`·`write-plan` / `code-placement` §5 fail-first↔seiri `implement`. filid 스킬·테스트는 규칙을 **번호로** 인용한다(§0 목록).

---

## 2. 판정 기준 (조항 단위 4분류 + 허용성)

| 분류 | 정의 | 처분 |
| --- | --- | --- |
| **K-방향** | 유능한 모델이 기본값으로 택하지 않거나 달리 택할 수 있는 입장 | 유지 |
| **K-사실** | 모델이 도출할 수 없는 규약·도구 의미론 | 유지(산문만 압축) |
| **D-기본기** | **허용 실측**(§0)이 "규칙 없이도 같은 행동"을 보인 조항 | 삭제 |
| **S-스킬중복** | 그 순간에 발화하는 스킬이 절차를 나르는 조항 | 판정 기준 + `/seiri:<name>` 포인터만 남김 |
| **P-정책** | 실측 없이 자율성 정책만으로 빼는 조항 | **R5p에서만** 삭제, 표시 |

골격: B1 Precedence 유지 · B6 이중 반증 유지 · B5 형식 근거 문장은 배포 문면에서 제거 후보(T4·D1 — 헌법 문서 동시 개정) · 목적 1문장·`Applies when` 유지.

---

## 3. 파일 지도 (실측 — `verify-arm.mjs`, 2026-08-30 v2)

후보 arm(정본): `.metadata/rule-bench/arms/{R4,R5,R5p}/`. 기준선: `arms/R3c/`(현행 templates 14/14 바이트 동일).

| 파일 | R4 | R5 | R5p | 비고 |
| --- | --- | --- | --- | --- |
| `seiri_test-validity.md` (3,546) | 3,338 — 6절→5절, S-절차 축약(imperative·scoped mechanism·before moving code·snapshot 문장 유지), 포인터 | = R4 | = R4 | §2(변조 프로브·raw-tool) 전 암 유지 |
| `seiri_cognitive-discipline.md` (3,834) | 2,428 — §3·합리화표 삭제, 포인터 | **은퇴** | **은퇴** | 근거: D9 2-2·gen5 행동층(허용) |
| `seiri_context-efficiency.md` (2,212) | 1,850 — §3을 §2에 흡수(flaky 예외 유지) | = R4 | **은퇴**(P) | |
| `seiri_reuse-first.md` (2,181) | 1,797 — §4·§5 삭제, **§1 리스트 verbatim** | = R4 | = R4 | KEEP 코어 유지(리뷰 반영) |
| `seiri_agent-legible.md` (1,969) | 1,705 — §5 삭제(structure §3과 중복) | = R4 | = R4 | R5p에서는 structure가 없으므로 §5의 대체 없음(P) |
| `seiri_naming.md` (1,898) | 1,795 — 인용 정리, §1·§2 압축 | = R4 | **은퇴**(P, 근거 얇음: Phase 0 §3 0/3) | |
| `seiri_structure.md` (2,010) | 1,872 — §4를 §3에 흡수 | = R4 | **은퇴**(P) | |
| `seiri_code-comments.md` (4,032) | 3,520 — 압축, "no comment repeats" 유지 | = R4 | 3,064 — §1 한 문장·§5 삭제(P), 은퇴 규칙 인용 제거 | |
| `seiri_public-contract.md` (1,951) | 무변경 | 무변경 | 무변경 | |
| `seiri_function-boundaries.md` (3,041) | 무변경 | 무변경 | 2,975 — 은퇴 규칙 인용 3건 제거 | |
| `filid_fractal-boundaries.md` (7,508) | 7,099 — 서술 압축, 표·목록·번호·"widening the contract"·"Undeclared, it stays a violation" 유지 | = R4 | = R4 | |
| `filid_code-placement.md` (3,107) | 3,046 — §4 압축, §5 fail-first 절 제거, §1 "Compute … consumer owners"·"defaults to" 유지 | = R4 | = R4 | |
| `filid_module-documents.md` · `filid_verification-records.md` | 무변경 | 무변경 | 무변경 | |
| **합계 / 상시** | **41,667 / 29,977 (−8.7% / −11.2%)** | **39,239 / 27,549 (−14.0% / −18.4%)** | **33,205 / 21,515 (−27.3% / −36.2%)** | T4 시 각 −1,729 B(R5p는 −1,236 B) |

수정(자동 연쇄): 두 `manifest.json`(`templateHash`; T4 시 `grounding`), `.claude/rules/*.md`, `AGENTS.md` 마커.

생성: `plugins/seiri/src/__tests__/ruleCrossReferences.test.ts`, `plugins/filid/src/__tests__/unit/core/ruleDocCrossReferences.test.ts`(T5) · `.metadata/rule-bench/judge-stage-a.mjs`, `results/2026-08-30-r4.md`, `results/2026-08-30-r4.jsonl`(T7).

수정(T4 조건부): `plugins/seiri/src/types/manifest.ts`, `plugins/filid/src/core/infra/configLoader/loaders/manifestTypes.ts`, 두 invariant 테스트, `plugins/filid/templates/rules/README.md`, `.metadata/rule-bench/README.md`, `.metadata/seiri/03-RULES.md`, **`.metadata/seiri/01-CONSTITUTION.md:51`**, **`.metadata/seiri/02-ARCHITECTURE.md:510`**, `arms/<채택 arm>/*.md`. (`verify-arm.mjs`는 v2에서 이미 manifest `grounding`을 인정한다.)

수정(T3b, R5/R5p 조건부): manifest 항목 삭제, `ruleInvariants.test.ts` D8 계약 항목, `.metadata/seiri/03-RULES.md`, `.metadata/seiri/README.md`, `01-CONSTITUTION.md:53`(예외 2건), R5p는 `02-ARCHITECTURE.md:303`.

건드리지 않음: `skills/**`, 훅·MCP 소스, `.codex-plugin/`·`bridge/`·`public/`(규칙 사본 없음 — 확인).

리뷰용 diff: `for f in .metadata/rule-bench/arms/R5p/*.md; do b=$(basename "$f"); p=plugins/seiri; case $b in filid_*) p=plugins/filid;; esac; diff -u "$p/templates/rules/$b" "$f"; done` (R4·R5도 동일).

---

## 4. 규칙별 조항 판정 (정본 문면 = `arms/<arm>/<file>`; 절 번호는 R4 기준)

표기: K 유지 · Kc 유지·압축 · D 삭제(허용 실측) · S 스킬 포인터 · P 정책(R5p) · X 인용 수정.

- **4.1 `seiri_test-validity.md`** — §1 S(imperative "run … and watch it fail"·scoped mechanism·"before moving code" 유지, 절차 세부는 `/seiri:implement`·`/seiri:trace-cause`) · §2 **K**(변조 프로브·raw-tool 구분은 스킬에 없음) · §3+§4 Kc 병합(스냅샷 "certifies the bug" 유지) · §5 Kc · §6 Kc. 전 암 동일.
- **4.2 `seiri_cognitive-discipline.md`** — 헤더 K · §1 S(`/seiri:verify`) · §2 S(`/seiri:trace-cause`, `Fix where it started` verbatim) · §3 "Read before you adapt" **P**(R4에서도 삭제 — 대응물 없음을 명시; 사용자 정책) · §4 K · §5 Kc · 합리화표 **D3**(D9 2-2 sonnet 리프트 0 — README KEEP 코어 "합리화표"와의 명시적 이탈; `02-ARCHITECTURE:313`의 "Red Flags 감가"는 근거로 쓰지 않는다 — 리뷰 소견 반영) · Red flags 줄 K. R5·R5p: 규칙 은퇴(허용 실측: D9 2-2, gen5 22/22, opus iE finalMention 8/8 R0 — 마지막 것은 포화 계기라 보조 근거).
- **4.3 `seiri_context-efficiency.md`** — §1 Kc · §2 S(`pays twice`; flaky 예외 유지) · §3 →§2 흡수. R5p: 은퇴(P).
- **4.4 `seiri_reuse-first.md`** — §1 **K verbatim**(KEEP 코어·haiku 허용 실측) · §2 K · §3 K · §4 S 삭제 · §5 D 삭제(자기 완결 근거: 일반 권고 — `seiri_naming` §2와의 중복은 부차 근거이므로 R5p에서 naming이 사라져도 처분은 서 있다).
- **4.5 `seiri_agent-legible.md`** — §5 삭제(structure §3 중복). R5p에서는 대체 없음 → P로 재분류·표시.
- **4.6 `seiri_naming.md`** — Kc + X. R5p: 은퇴(P; 근거 얇음).
- **4.7 `seiri_structure.md`** — Kc, §4 흡수. R5p: 은퇴(P).
- **4.8 `seiri_code-comments.md`** — 전 절 Kc("no comment repeats" 유지). R5p: §1 한 문장·§5 삭제(P), 인용 제거(X).
- **4.9 `seiri_public-contract.md`·`seiri_function-boundaries.md`** — 무변경(R5p만 function-boundaries 인용 3건 X).
- **4.10 `filid_fractal-boundaries.md`** — §1·§2·§3·§5·§6 Kc(도구 의미론 문장 전부 유지). §6 번호 고정.
- **4.11 `filid_code-placement.md`** — §1 Kc("Compute … consumer owners", "defaults to" 유지) · §4 Kc · §5 Kc + fail-first 절 제거(소유권: seiri).
- **4.12 `filid_module-documents.md`·`filid_verification-records.md`** — 무변경.
- **4.13 골격(T4)** — 14종(은퇴분 제외)에서 B5 문장 제거 → manifest `grounding`.

---

## 5. 태스크

실행 순서: **T0 → T5 → T7-A(벤치 Stage A·B·C 실행, 판정) → D6(사용자: R4/R5/R5p) → T1(채택 arm 복사) → T3b(R5/R5p: 은퇴) → T4(D1) → T6(동기화·고아 제거·기록) → T7-D(결과 문서·jsonl·패리티)**. 각 태스크 종료 시 `/seiri:verify`.

### T0 — `harness-reporter-pin` (계획 중 발견한 기존 결함)

Node v24.14.0에서 `node --test` 기본 리포터가 비-TTY에서도 `spec`이라 `grade.mjs:45`의 `/^# pass (\d+)/m`가 0을 돌려주고, selftest가 exit 1(12이슈 중 11개 `correct:false`; 유일 통과 iF는 종료코드 채점)이다. `NODE_OPTIONS='--test-reporter=tap'`로 iA·iC·iE·iJ 전부 `correct:true` 확인.

1. `.metadata/rule-bench/grade.mjs` `runNodeTest`의 spawn 인자를 `['--test', '--test-reporter=tap', ...files]`로.
2. `node .metadata/rule-bench/grade.mjs --selftest` → 12줄 `"correct":true`, 종료 0.

### T5 — `cross-reference-guard`

1. 생성 `plugins/seiri/src/__tests__/ruleCrossReferences.test.ts` — v1 코드(이 문서 v1, git 이력)에 다음을 반영: (a) 스캔 확장자 `.md`·`.ts`(소스 주석의 인용 포함), (b) 문서 주석을 "existing heading으로 해석됨만 검사 — 유효하지만 다른 절로의 재번호는 잡지 못한다"로 정직하게 서술. 골격:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

/**
 * A mechanical drift guard on section citations: every `seiri_<rule>` §N in a
 * rule, a skill, a module document or a source comment resolves to a `## N.`
 * heading in that rule, and every bare §N inside a rule resolves to its own
 * headings. It catches a citation of a section that no longer exists; it does
 * not catch a renumbering that lands on another existing section.
 */
const packageRoot = portableJoin(portableDirname(fileURLToPath(import.meta.url)), '..', '..');
const rulesDir = portableJoin(packageRoot, 'templates', 'rules');
const SKIP = new Set(['node_modules', 'dist', 'bridge', 'public']);
const SCANNED = /\.(md|ts)$/;
const NAMED = /\b(seiri_[a-z-]+)(?:\.md)?`?\s*§(\d+)/g;
const BARE = /§(\d+)/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = portableJoin(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SCANNED.test(name) ? [path] : [];
  });
}

const headings = new Map<string, Set<number>>(
  readdirSync(rulesDir)
    .filter((name) => name.startsWith('seiri_') && name.endsWith('.md'))
    .map((name) => {
      const text = readFileSync(portableJoin(rulesDir, name), 'utf8');
      const numbers = Array.from(text.matchAll(/^## (\d+)\./gm), (m) => Number(m[1]));
      return [name.slice(0, -'.md'.length), new Set(numbers)];
    }),
);

describe('rule section citations', () => {
  it('resolves every seiri_<rule> §N to an existing heading', () => {
    const files = ['skills', 'src', 'templates'].flatMap((dir) => sourceFiles(portableJoin(packageRoot, dir)));
    const broken = files.flatMap((file) =>
      Array.from(readFileSync(file, 'utf8').matchAll(NAMED))
        .filter(([, rule, n]) => !headings.get(rule)?.has(Number(n)))
        .map(([, rule, n]) => `${file}: ${rule} §${n}`),
    );
    expect(broken).toEqual([]);
    expect(headings.get('seiri_naming')?.has(99)).toBe(false);
  });

  it("resolves every bare §N inside a rule to that rule's own headings", () => {
    const broken = Array.from(headings).flatMap(([rule, own]) => {
      const text = readFileSync(portableJoin(rulesDir, `${rule}.md`), 'utf8').replace(NAMED, '');
      return Array.from(text.matchAll(BARE)).filter(([, n]) => !own.has(Number(n))).map(([, n]) => `${rule} §${n}`);
    });
    expect(broken).toEqual([]);
  });
});
```

2. 생성 `plugins/filid/src/__tests__/unit/core/ruleDocCrossReferences.test.ts` — 동일 구조(`join`·`fileURLToPath(new URL('../../../../', import.meta.url))`), 접두 `filid_`; **cross-namespace**: `seiri_` 인용은 형제 경로 `join(packageRoot, '..', 'seiri', 'templates', 'rules')`가 존재할 때 그 헤딩으로 해석하고, 없으면 건너뛴다(`plugins/filid/src/core/rules/ruleEngine/DETAIL.md:20`의 `seiri_public-contract §1`이 대상). `SKIP`에 `.codex-plugin` 추가.
3. 프로브(red 확인 후 복원, **사전 clean 확인**): `git diff --quiet -- plugins/filid/skills/cross-review/contracts.md || { echo "dirty — probe skipped"; exit 1; }; sed -i '' 's/filid_fractal-boundaries §6/filid_fractal-boundaries §9/' plugins/filid/skills/cross-review/contracts.md && yarn filid test:run src/__tests__/unit/core/ruleDocCrossReferences.test.ts; git checkout -- plugins/filid/skills/cross-review/contracts.md` — 첫 실행 출력에 `1 failed`, 복원 후 G3 green.

### T7-A — `bench` (**결정 D5: 채택 게이트**; T1 앞에서 실행)

전제: T0 완료. 규약: `node .metadata/rule-bench/prepare.mjs --issue <id> --arm <R0|R3c|R4|R5|R5p> --rep <n> --out <scratchpad>` → 무개입 프롬프트를 서브에이전트(`subagent_type: general-purpose`, `model` 지정)에 전달 → `<runDir>/FINAL.md` 저장 → `node .metadata/rule-bench/grade.mjs <runDir> --log <scratchpad>/results-r4.jsonl`. 기준선 **R3c**(현행 스냅샷). 08-02의 R3 수치는 역사적 참고치(3파일 상이).

| 단계 | 셀 | 목적 |
| --- | --- | --- |
| **A** 회귀 가드(게이트) | 변경 규칙을 표적으로 갖는 이슈 전부(`issues/*/meta.json ruleTargets`): R4 = iA·iC·iD·iE·iF·iG·iH·iI·iK × haiku × {R3c, R4} × 5 · R5 = 위 + iE × haiku × R5 × 5 · R5p = 위 + iD·iI × haiku × R5p × 5, iJ × sonnet × {R3c, R5p} × 5 | 약모델 회귀 가드. 포화 이슈도 포함한다: R0 만점인 계기에서 후보가 만점을 잃으면 그것이 곧 회귀 신호다 |
| **B** 기본기 프로브(표적 모델) | iK·iL × {opus, sonnet} × {R0, R4} × 5 | S1 §1(iK가 재는 것)·S2 §2(iL)의 gen-4 근거가 gen-5에도 성립하는가 — R4·R5·R5p 공통 |
| **C** 정보용 | iE × opus × R5 × 3 | cognitive 은퇴의 표적 모델 영향(R0 8/8 기록 있음) |

런 수: A = 9×2×5(90) + 5 + 10 + 10(sonnet) = **115** · B = 2×2×2×5 = **40**(opus 20·sonnet 20) · C = **3**(opus) → **158**(haiku 105·sonnet 30·opus 23). 웨이브 8~10 병렬. **실패 런** = 인프라 실패(스폰 오류·타임아웃·채점기 예외)만이며 같은 rep 1회 재시도; 낮은 점수는 결과다.

**사전 기준(실행 후 변경 금지)** — 주지표 = full-pass 수(hidden 전 항목 통과 런 수)/n:

- Stage A, 이슈별: `fullpass(후보) ≥ fullpass(R3c) − 1`이면 통과(1런 이내 차이는 노이즈 밴드로 선언). 미달 시 그 이슈만 n=8로 확장해 같은 기준으로 재판정. 후보 채택 = **모든 이슈 통과**. 통계적 유의 주장이 아니라 채택 절차임을 결과에 적는다.
- Stage B: `fullpass(R0) ≥ 4/5` **그리고** `fullpass(R0) ≥ fullpass(R4)`가 iK·iL 각각, opus·sonnet 각각에서 성립할 때만 해당 절(S1 §1 / S2 §2)을 "표적 모델의 기본기"로 판정해 R6 결정으로 회부. 동률 0=0은 판정 불능이지 기본기가 아니다. S1 §3(name trap)은 iK가 재지 않으므로 R6 범위 밖.
- 판정은 `node .metadata/rule-bench/judge-stage-a.mjs <results.jsonl> <candidate-arm>`이 기계로 낸다. 정본 matrix는 R4=`luna × {iA,iC,iD,iE,iF,iG,iH,iI,iK} × 5`, R5=`luna × iE × 5`, R5p=`luna × {iD,iI} × 5 + terra × iJ × 5`다. 스크립트는 전 원장의 `model|issue|arm|rep` 중복을 거부하고, 각 기준·후보 셀이 rep 1~5를 정확히 한 번씩 가져야만 비교한다. Stage B와 `sol × iE × R5 × 3` Stage C는 이 whitelist 밖이라 채택 판정에 섞이지 않는다. 회귀 기준은 같은 모델·이슈에서 shown+hidden 모두 통과한 `fullpass(후보) ≥ fullpass(R3c)-1`이다.

실행 중 발견·수정: 최초 스니펫은 `model`을 집계 키에서 빠뜨려 R5의 luna 5런과 sol 3런을 R3c luna 5런에 섞었고, 첫 수정은 존재하는 후보 셀만 열거해 누락 셀이 있어도 PASS할 수 있었다. 최종 구현은 위 고정 matrix와 정확한 rep 집합을 검사하며 `judge-stage-a.test.mjs`가 누락·중복·unmatched-model 실패를 고정한다. 0=0 동률의 PASS는 비회귀만 뜻하며 은퇴 근거로 쓰지 않는다.

한계(정직하게): 표적 모델(opus)은 A의 계기에서 포화라 A는 **약모델 회귀만** 잡고 R4/R5/R5p를 가르지 못한다 — 그 선택은 D6(정책). 벤치는 스킬·훅 없이 규칙 파일 채널만 재므로 S-분류와 D4의 실효는 측정 밖. 장기세션·컴팩션 체제도 측정 밖.

### T1 — `adopt-arm` (D6 이후; arm 무관 절차)

`ARM`은 D6 결과(R4·R5·R5p 중 하나). 1) `cp .metadata/rule-bench/arms/$ARM/seiri_*.md plugins/seiri/templates/rules/ && cp .metadata/rule-bench/arms/$ARM/filid_*.md plugins/filid/templates/rules/` — arm에 있는 파일 전부(function-boundaries 포함). 2) `yarn seiri build:rules && yarn filid build:rules`. 3) `yarn seiri test:run && yarn filid test:run` — R5/R5p는 T3b 완료 전까지 D8 계약·인용 가드가 red인 것이 정상.

### T3b — `retire-rules` (R5: cognitive-discipline · R5p: + context-efficiency·naming·structure)

0. 원장 적응: `sed -i '' "s#arms/R4#arms/$ARM#g" .seiri/tasks/rule-docs-prune/gates.md`; G5·G9의 은퇴 파일 토큰 검사는 `! test -f <file>`로 교체(정확한 CHECK는 원장 T3b 절 참조).
1. `git rm plugins/seiri/templates/rules/<은퇴 파일>` (R5: 1종, R5p: 4종).
2. manifest 항목 삭제. `recommended` 4종은 그대로.
3. `ruleInvariants.test.ts` D8 계약: R5는 `seiri_cognitive-discipline.md` 항목만 제거(`pays twice` 항목 유지), R5p는 `it('D8 shared idioms …')` 블록 삭제. `renderStatusLines.test.ts`의 id 문자열은 픽스처 — 무변경.
4. 설계 정본 개정: `.metadata/seiri/03-RULES.md` 상태표 "은퇴(2026-08-30, <arm>)", `.metadata/seiri/README.md` 구성 절, `01-CONSTITUTION.md:53`(예외 2건 → R5: 예외 1건 `context-efficiency`; R5p: 단락 삭제), R5p만 `02-ARCHITECTURE.md:303`(연속 구속 사례에서 naming·structure 제거 + "존재 여부는 정책(2026-08-30)" 한 줄).
5. `yarn seiri build:rules && yarn seiri test:run` green.

### T4 — `skeleton-grounding-to-manifest` (**결정 D1** — 기본값: 실행)

1. 추출·주입(제거보다 먼저): `node -e 'const fs=require("fs");for(const p of ["plugins/seiri","plugins/filid"]){const mp=p+"/templates/rules/manifest.json";const m=JSON.parse(fs.readFileSync(mp,"utf8"));for(const r of m.rules){const t=fs.readFileSync(p+"/templates/rules/"+r.filename,"utf8");const s=t.match(/This rule rests on (?:a property|properties)[^.]*\./);if(!s)throw new Error("no grounding: "+r.filename);r.grounding=s[0];}fs.writeFileSync(mp,JSON.stringify(m,null,2)+"\n");}console.log("grounding injected")'` — `sync-rule-hashes.mjs`는 JSON 왕복이라 필드를 보존한다(리뷰 확인).
2. 제거(templates와 채택 arm 양쪽): `perl -0pi -e 's/ This rule rests on (?:a property|properties)[^.]*\.//' plugins/seiri/templates/rules/seiri_*.md plugins/filid/templates/rules/filid_*.md .metadata/rule-bench/arms/$ARM/*.md` (문장 14개 전부 내부 마침표 없음 — 확인).
3. 타입: `RuleDocEntry`에 **선택** 필드 `/** Authoring-time admission gate (design B5): the universal property this rule rests on. Never rendered into the deployed document. */ grounding?: string;` (필수로 두면 export된 공개 타입의 파괴적 변경 — 리뷰 소견 반영). seiri `manifest.ts`·filid `manifestTypes.ts`.
4. 테스트 교체 — seiri `ruleInvariants.test.ts`의 B5 `it`:

```ts
  it('keeps the B5 grounding in the manifest, out of the deployed bytes', () => {
    const GROUNDING = /\brests on (a property|properties)\b/i;
    const missing = loadManifest(packageRoot)
      .rules.filter((r) => !GROUNDING.test(r.grounding ?? ''))
      .map((r) => r.id);
    expect(missing).toEqual([]);
    const leaked = rules.filter((r) => GROUNDING.test(r.text)).map((r) => r.name);
    expect(leaked).toEqual([]);
    expect(GROUNDING.test('a rule with no grounding sentence')).toBe(false);
  });
```

   filid `ruleDocInvariants.test.ts`도 같은 형태(`loadRuleDocsManifest(packageRoot).rules`, `shipped`).
5. 문서(전부): `plugins/filid/templates/rules/README.md` 1항 · `.metadata/rule-bench/README.md` 게이트 1 · `.metadata/seiri/03-RULES.md` §1 B5 · **`.metadata/seiri/01-CONSTITUTION.md:51`**("각 규칙 문서는 … 반드시 포함" → "각 규칙은 manifest `grounding`에 … 문장을 반드시 갖는다; 기계 검사는 manifest를 본다") · **`.metadata/seiri/02-ARCHITECTURE.md:510`**(rule-lint 표 "형식 근거" 행을 manifest 검사로).
6. `node .metadata/rule-bench/verify-arm.mjs $ARM` → OK(v2는 manifest `grounding`을 인정) · `yarn seiri build:rules && yarn filid build:rules && yarn seiri test:run && yarn filid test:run`.

### T6 — `sync-and-record`

1. `node .metadata/rule-bench/apply-rules-sync.mjs` → `synced:`; 재실행 → `all targets already in sync`.
2. **고아 제거(R5/R5p)**: `.claude/rules/<은퇴 파일>` `rm`; `AGENTS.md`의 `<!-- SEIRI:START:<file> -->` … `<!-- SEIRI:END:<file> -->` 블록을 `perl -0pi -e 's/<!-- SEIRI:START:seiri_X\.md -->.*?<!-- SEIRI:END:seiri_X\.md -->\n?//s' AGENTS.md`로 삭제(은퇴 파일마다). 게이트 G29가 고아 0건을 검사한다.
3. 3면 파리티(templates == `.claude/rules` == `AGENTS.md` 마커 == `arms/$ARM`): G19·G20·G22.
4. `.metadata/seiri/03-RULES.md` `**v3 정리(2026-08-30)**` 단락: 기준·허용성 원칙·채택 arm·잘린 층·근거·D8 다섯 근거에 대한 입장(§1)·복원 경로·실측 절감. `.metadata/rule-bench/README.md`: arms 줄에 `R3c`(현행 스냅샷)·`R4`·`R5`·`R5p`, KEEP 코어 갱신(D3 이탈 명시), 게이트 3의 사전 기준을 `judge-stage-a.mjs`로.
5. 과도기: 플러그인 재설치 전까지 세션 훅의 "drift" 경고 — 기록만.

### T7-D — `bench-record`

1. `<scratchpad>/results-r4.jsonl`을 `.metadata/rule-bench/results/2026-08-30-r4.jsonl`로 복사(재현 가능성).
2. `.metadata/rule-bench/results/2026-08-30-r4.md`: Stage A/B/C 표(이슈 × 암 × full-pass/n · hidden 합), 사전 기준, `judge-stage-a.mjs` 출력 verbatim, 판정, "측정 밖" 명시, D6 결과.
3. G31: `node .metadata/rule-bench/judge-stage-a.mjs .metadata/rule-bench/results/2026-08-30-r4.jsonl $ARM` → `STAGE_A_$ARM_PASS`.

---

## 6. 태스크 간 인터페이스

| 생산 | 소비 | 계약 |
| --- | --- | --- |
| T0 `grade.mjs`(TAP 고정) | T7-A 채점 | `{issue, arm, rep, shownPassed, shownTotal, hiddenPassed, hiddenTotal}` jsonl 1행/런 |
| T7-A jsonl + `judge-stage-a.mjs` | D6, T7-D G31 | `STAGE_A_<ARM>_PASS` 출력 |
| D6 `ARM` | T1·T3b·T4·T6·원장 sed | arm 디렉터리 이름 그대로 |
| T5 두 테스트 | T1 이후 `test:run` | 인용 형태 `` `seiri_x` §N `` / `` `seiri_x §N` `` / `seiri_x.md §N` |
| T1 templates(== arm) | T4 | T4는 양쪽 사본의 헤더 한 문장만 뺀다 |
| T4·T3b manifest | T6 apply-rules-sync | manifest에 있는 항목만 동기화; 없는 항목의 고아는 T6 2항이 지운다 |

---

## 7. 결정 항목

| # | 결정 | 상태 | 대안 | 근거 |
| --- | --- | --- | --- | --- |
| D1 | B5 문장 → manifest `grounding`(T4) | 기본값 실행 | 유지 | 런타임 방향 0; 헌법 문서(01:51·02:510) 동시 개정 |
| D2 | `seiri_structure` | R4·R5 압축 / R5p 은퇴(P) | — | 실측 없음 → 정책 암에서만 |
| D3 | cognitive-discipline 합리화표 삭제(R4) | 삭제 | 표 유지(`arms/R3c` 복원) | D9 2-2·gen5 행동층(허용 실측); README KEEP 코어 "합리화표"와의 명시적 이탈 |
| D4 | 규칙 본문의 `/seiri:<name>` 포인터 | 채택 | 미언급 | 02-ARCHITECTURE 허용; 실효는 벤치 밖(정직성) |
| D5 | 벤치를 채택 게이트로 | **게이트(Stage A, `judge-stage-a.mjs`)** | — | 사용자 결정 2026-08-30 |
| D6 | 채택 arm: R4 / R5 / R5p | **벤치 결과 후 사용자 결정** | — | 저자 권고: 허용 실측 기준이면 **R5**; 자율성 정책을 문자 그대로 적용하려면 R5p(설계 정본 개정 동반) |

---

## 8. 자기 검토

- 요구→태스크 매핑: 불필요 내용 제거(T1·T3b·T4) · 스킬 상호작용(§1·S-분류·D4·T5) · 벤치 게이트(T7-A/D·D5) · "더 뺄 항목"(§10·R5·R5p) — 전부.
- 플레이스홀더: 없음. 정본 문면은 `arms/{R4,R5,R5p}` — 이 세션에서 `verify-arm.mjs`로 4암 전부 `*_INVARIANTS_OK`(2026-08-30 v2: R3c 45,653 / R4 41,667 / R5 39,239 / R5p 33,205).
- `verify-arm.mjs` 면제 2건(정직): footer 비교에서 `seiri_reuse-first.md`(§4 인용 제거), 표 비교에서 `seiri_cognitive-discipline.md`(합리화표 삭제) — 둘 다 의도된 차이.
- 기준선 실측(2026-08-30): seiri 268 passed · filid 1030 passed, 7 skipped · selftest T0 전 red, TAP 강제 시 green.
- 원장: `.seiri/tasks/rule-docs-prune/gates.md` — `gates` status가 파싱(백틱 포함 값은 이중 백틱 스팬).
- 경로·심볼 실존: 이 세션 도구 출력으로 확인(규칙 14종·manifest 2·테스트 3·loader 2·타입 2·`apply-rules-sync.mjs`·`prepare.mjs`·`grade.mjs`·`verify-arm.mjs`·`arms/{R3c,R4,R5,R5p}`·설계 문서 줄 번호 01:51·02:303·02:510·SYNTHESIS:43·README:42,48).

---

## 9. 리뷰 기록

### 9.1 `/seiri:review-plan` (v1, 2026-08-30) — `grounded-only`

접지 완료(바이트·인용·테스트·T4 dry-run·`.codex-plugin` 무사본·문서 줄·`build:rules --check`·selftest 상태). 챌린지는 사용자 결정으로 `/cennad:crosscheck` 위임.

### 9.2 `/cennad:crosscheck` 종합 (세션: antigravity `09929431-f1b2-49e6-bc11-7684d4a8c213` · codex `a3dc0082-9fda-4857-9dda-7ae48b42c538` · claude `5b62f953-02f4-4f5e-a7e1-e6d7f88c259f`) — 세 소견 모두 `VERDICT: rework-required`

**Agreed** (셋 또는 둘): 실행 순서 자기모순(codex·claude) · R5 은퇴본의 `.claude/rules`·`AGENTS.md` 고아 미제거 + G19/G20 무감지(codex·claude) · T4의 `arms/R4` 고정 경로와 `verify-arm.mjs` 무효화(codex·claude) · 01-CONSTITUTION:51·02-ARCHITECTURE:510 미개정(codex·claude) · Stage A가 변경 규칙 대부분을 재지 않음(셋) · Stage B 동률 허용·표본(codex·claude·antigravity) · 런 수 산식(codex) · 의미 드리프트: test-validity §1 imperative/scoped mechanism/before moving code, snapshot 문장, context-efficiency flaky 예외, code-comments "no comment repeats", fractal-boundaries "widening the contract"/"Undeclared, it stays a violation", code-placement "Compute … consumer owners"/"defaults to"(셋 합집합) · R5의 reuse-first §1 축약이 KEEP 코어 위반(antigravity·claude) · test-validity §2 삭제 근거 절반만 참(claude) · D8 다섯 근거 미반박·02-ARCHITECTURE:303 미인용(codex·claude) · §10이 README:42,48이 금지한 포화 근거 위에 섬(claude·codex) · KEEP 코어 "전부 보존" 주장과 D3 모순(claude) · T5 프로브의 사용자 변경 소실 위험(codex) · cross-namespace·`.ts` 주석 인용 미검사(셋).

**Conflicting**: 결정을 바꾸는 충돌 없음 — B5 이관을 antigravity는 "맥락 손실"(note)로, codex·claude는 "헌법 미개정"(error)으로 다뤘으나 처방(D1 유지 + 문서 개정)은 같다. 수렴 라운드 생략.

**Final direction**: R5를 증거 기반(R5)과 정책(R5p)으로 분리, 드리프트 6건 복원, T7 재설계(전 변경 규칙 이슈·n=5·기계 판정·Stage B 하한), 절차 완결(고아 제거·arm 무관 복사·헌법 개정·원장 게이트), 벤치 후 D6.

**Action checklist** → 이 v2에 전부 반영(§10 허용성 열, §1 D8 입장, T1 통합, T3b 4항, T4 3·5항, T6 2항, T7-A 표·기준·`judge-stage-a.mjs`, T5 3항 clean 확인·`.ts` 스캔·cross-namespace, 원장 G28–G31).

**Artifacts**: 없음(세 봉투 모두 `artifact_path` 없음).

### 9.3 `/seiri:receive-review` 처리

- 수용·반영: 위 Agreed 전부.
- 반박(근거): claude 소견 7 "G10 손상 잔존" — 그 읽기 시점 이후 원인(CHECK 값의 원시 백틱이 단일 백틱 스팬을 조기 종료 → format-on-stop 훅의 prettier가 문단 재접합)을 잡아 G10·G13을 이중 백틱 스팬으로 고쳤고 `gates` status가 27개를 정상 파싱함을 재확인. `.prettierignore`에 `.seiri/`를 추가하지 않는 이유: gates-format이 포매터를 전제로 코드 스팬 규약을 두고 있어 규약 준수가 맞는 수정.
- 범위 밖(사용자 보고): antigravity가 관측한 `plugins/filid/src/hooks/userPromptSubmit/__tests__/injectContext.test.ts` 3건 실패 — `CLAUDE_CODE_*` 환경변수가 누출되는 중첩 CLI 환경에서만 재현되며(`inspectFcaPolicy.ts:16 resolveRuntimeHost(process.env)`), 이 세션의 실행에서는 1030 passed. 규칙 정리와 무관한 테스트 격리 결함 — 별건.
- 미해결로 남긴 것: claude note "T5 가드는 유효-타절 재번호를 잡지 못한다" — 문서 주석에 한계로 명시(T5 1항 b). 벤치가 스킬·훅 채널을 재지 못한다는 원리적 한계 — §0 정직성·T7 한계에 명시, 해결책 없음.

---

## 10. "모델이 이미 잘하는 항목" — 허용 실측 기준의 답

| 항목 | 허용 실측 | 불허 근거(참고만) | 처분 |
| --- | --- | --- | --- |
| `seiri_cognitive-discipline` 전체 | D9 2-2 sonnet 리프트 0(증상 패치·거짓 done 순간 도달) · gen5 행동층 22/22 | opus iE 8/8 R0(포화) | **R5·R5p 은퇴** — 근거 있는 유일한 규칙 단위 은퇴 |
| `seiri_test-validity` §1 fail-first 절차 · `cognitive` §1·§2 · `context-efficiency` §2 절차 · `reuse-first` §4 | D9 2-2·gen5(절차 수행) + D7-E(스킬이 나름) | iF 포화 | **S-분류(R4)** — 판정 기준은 남고 절차만 스킬로 |
| `seiri_naming` | Phase 0 §3 대조군 0/3(gen-4, 표본 3) | iD 포화 | R4·R5 유지 / **R5p 은퇴(P)** |
| `seiri_structure` · `seiri_context-efficiency` 전체 | 없음 | — | R4·R5 유지 / **R5p 은퇴(P)** — 02-ARCHITECTURE:303·01:53 개정 동반 |
| `seiri_reuse-first` §1 5단계 | haiku 확률적 리프트(17→50%, 허용) | opus·sonnet 포화 | **전 암 verbatim 유지** |
| `seiri_code-comments` §1·§5 | 없음 | iI 포화 | R4 압축 / **R5p 축약(P)** |
| `seiri_test-validity` §2 | — (스킬에 대응물 없음: 변조 프로브·raw-tool 구분) | — | **전 암 유지** |
| `seiri_agent-legible` §1–§3 · `seiri_public-contract` §1–§2 | Phase 0 반전(gen-4) | iA·iB 포화 | 유지 — **Stage B**(iK·iL × opus·sonnet, 하한 기준)가 gen-5 답을 준다 |
| `seiri_function-boundaries` | sonnet iJ 50→100 | opus 포화 | 유지 |
| filid 4종 | (도구 의미론·리뷰어 계약) | iG·iH 포화 | 유지(압축) |
| B5 골격 문장 | 런타임 방향 0(설계상) | — | T4(공통) |

요약: 허용 실측만으로 "이미 잘한다"고 말할 수 있는 것은 **cognitive-discipline의 은퇴와 프로세스 절차의 스킬 이관**(R5)이다. 그 이상(R5p: naming·structure·context-efficiency 은퇴, code-comments 축약)은 자율성 **정책**이며, 벤치는 표적 모델에서 이를 검증하지 못하고 설계 정본 개정을 요구한다. 다음 층(S1·S2)은 Stage B가 결정한다.
