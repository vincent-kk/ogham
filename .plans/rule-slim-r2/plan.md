# 규칙 압축 R2 + 판정 하네스 벤치마크 — 실행 계획

> 2026-08-01. 목표: seiri 10종 + filid 4종 규칙 문서를 Karpathy-CLAUDE.md 풍의 짧고 간결한 형태(R2)로 재작성하되, 행동 효능을 판정 하네스 A/B(R0 무규칙 / R1 현행 / R2 압축)로 검증한 뒤 채택한다. 채택은 워킹트리까지만 — 커밋은 사용자가 한다.

## 0. 전역 제약 (모든 태스크가 상속)

**드리프트 가드 불변식** — `plugins/seiri/src/__tests__/ruleInvariants.test.ts` · `plugins/filid/src/__tests__/unit/core/ruleDocInvariants.test.ts`가 기계 검사:

- 모든 규칙 파일은 `> **Precedence**:` 로 시작하는 줄을 가진다(내용 압축은 가능, 접두 유지).
- 모든 규칙 파일은 `rests on a property…` 또는 `rests on properties…` 문장을 가진다(B5).
- 모든 규칙 파일은 `This rule is working if:` 와 `is wrong for you if:` 를 모두 가진다(B6).
- seiri 산문에 숫자 임계값 금지 — 유일 예외는 `seiri_function-boundaries.md`의 `8 lines`이며, 문장 "each helper's implementation body must be 8 lines or fewer; its declaration or signature and enclosing braces do not count" 는 **verbatim 보존**.
- seiri 산문에 러너명(npm/yarn/pnpm/pytest/cargo/go test/gradle/mvn) 금지.
- D8 공유 관용구 verbatim 보존: `pays twice` → `seiri_context-efficiency.md`, `fix where it started` → `seiri_cognitive-discipline.md`.
- 조건부 로드 집합 고정: seiri 는 `seiri_test-validity.md` 포함(paths frontmatter, `globs:` 금지), filid 는 정확히 `filid_module-documents.md`·`filid_verification-records.md` 두 개. frontmatter `paths:` 블록은 현행 그대로 복사.
- 각 규칙 ≤200줄. 파일명 변경 금지. 영어로 작성. LF. prettier 미적용(루트 `.prettierignore`·`.gitattributes`가 전제).

**D9 실측 KEEP 코어** (삭제 금지 — 구속력의 원천으로 실측됨):

- S1 agent-legible: 레시피 템플릿 `loaded by <mechanism>; <path/name/annotation> determines <what>` + `entry point is <X>, not <Y>`.
- S2 public-contract: wildcard 금지 3-근거 코어.
- S4 reuse-first: §1 우선순위 5단계 리스트(haiku +20pp의 원천 — verbatim 수준 보존).
- S5 naming: sibling-mirror + grab-bag 목록.
- S8 cognitive-discipline: 금지+합리화표 형태 + Red Flags(형태 삭감은 역효과 실측).

**filid KEEP 스펙** (모델이 도출 불가능한 프로젝트 고유 규약):

- fractal-boundaries: 분류 4형 표, 8단계 분류 순서, 기본 organ 이름 15개 목록, organ 접근 3행 판정표, 검증 파일 면제 조항, DAG/깊이.
- module-documents: INTENT 50줄 캡, 섹션 헤딩 목록(영어 고정), History 단일 주소, Boundary Exemptions 문법 블록.
- verification-records: 15/32 캡, case 계산 규칙 5행, `filid:contract <group-id>` 마커.
- code-placement: LCA 배치, organ은 LCA 불가, requiresDecision, 문서-선행 워크플로.

**편집 → 동기화 플로우** (T5에서만 실행): `plugins/<p>/templates/rules/*.md` 편집 → `yarn workspace @ogham/<p> build:rules`(해시 재주입) → `yarn workspace @ogham/<p> test:run` → `.claude/rules/*.md` + 루트 `AGENTS.md` 마커 구간(`<!-- SEIRI:START:<file> -->`/`<!-- FILID:START:<file> -->`) 동기화(템플릿 바이트 verbatim, 조건부 규칙은 frontmatter 포함 — 현행 렌더링과 동일).

**벤치마크 격리 규약** (d9 §4 계승): 실행은 스크래치패드 격리 저장소에서만, 프롬프트에 규칙/seiri/측정 언급 금지(무개입), 기존 테스트 파일 수정 금지 지시, hidden 오라클은 실행 디렉터리에 미배치·채점 시에만 적용, 채점 전 pristine shown 테스트 복원. 피험자는 Agent 도구 서브에이전트(model: haiku, subagent_type: general-purpose) — 기존 효능 A/B·D9와 같은 계기(fenced subagent proxy)로 비교 가능성 유지. 주변 컨텍스트 오염은 3암 공통 상수로 통제됨을 보고서에 명기.

**압축이 삭제하는 것 / 남기는 것**: 삭제 — 정당화 산문, 서두 목적 문단의 부연, Tradeoff 서술 중 행동을 바꾸지 않는 부분, 중복 헤딩-테제, 명백히 규칙을 재서술하는 Ask-yourself. 유지 — 규범 명령, 레시피/표/목록/문법 블록, 적용조건(Applies when)과 wrong-if 중 오적용을 막는 것, 결정 절차를 주는 Ask-yourself. 프로세스 규칙(S3·S6·S7·S8)의 규범 내용은 R0 통과를 근거로 삭제하지 않는다(SYNTHESIS: 단일샷 0/N은 계측기 부적합이지 무용 아님) — 압축은 문장 밀도만 높인다.

## 1. 파일 지도

생성:

- `.metadata/rule-bench/README.md` — 하네스 설계 문서(구성·실행법·채점 스키마·재사용 절차).
- `.metadata/rule-bench/issues/<id>/fixture/**` — 이슈별 pristine 픽스처(Node, 무의존, `node --test`).
- `.metadata/rule-bench/issues/<id>/hidden/*.test.js` — hidden 오라클(실행 디렉터리 미배치).
- `.metadata/rule-bench/issues/<id>/task.md` — shown 과제 본문(무개입).
- `.metadata/rule-bench/issues/<id>/meta.json` — `{id, title, ruleTargets, protectedFiles, selftest:{naive:[{file,content}], correct:[{file,content}]}}`.
- `.metadata/rule-bench/arms/R1/*.md` — 현행 14 규칙 사본. `arms/R2/*.md` — 압축 초안 14종.
- `.metadata/rule-bench/prepare.mjs` — 실행 디렉터리 생성(픽스처 복사 + 암 규칙을 `.claude/rules/`에 배치 + 프롬프트 조립·출력).
- `.metadata/rule-bench/grade.mjs` — 채점(pristine 복원 → hidden 배치 → `node --test` → JSON 행). `--selftest`로 base/naive/correct 판별력 검증.
- `.metadata/rule-bench/apply-rules-sync.mjs` — 채택 시 templates → `.claude/rules/` + `AGENTS.md` 마커 동기화.
- `.metadata/rule-bench/results/2026-08-01-r2.md` — 결과 정본(토큰 절감표 + 이슈×암 표 + 채택/롤백 + 삭제 숙고 목록).
- `.plans/rule-slim-r2/plan.md` — 이 문서.

수정(T5 채택 시): `plugins/seiri/templates/rules/*.md` 10종, `plugins/filid/templates/rules/*.md` 4종, 두 `manifest.json`(스크립트가 갱신), `.claude/rules/*.md` 14종, `AGENTS.md` 마커 구간, `.metadata/seiri/03-RULES.md`(B-상용구 개정 노트 + 상태표 갱신).

## 2. 판정 하네스 — 이슈 배터리 (10)

각 이슈 = shown 과제(보이는 실패 테스트 또는 명시 요구) + hidden 오라클(관례 존중을 다중 assert로 채점, 부분 점수 = 통과 assert 비율). 오라클 판별력은 self-test로 사전 검증: base는 shown 실패, naive 패치는 shown 통과·hidden 실패, correct 패치는 둘 다 통과.

| id  | 표적 규칙                 | shown 과제                    | hidden 오라클 핵심                                                                    |
| --- | ------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| iA  | S1 agent-legible          | CLI에 `status` 명령 추가      | 새 명령 파일이 형제처럼 `loaded by …` 배선 표지를 단다                                |
| iB  | S2 public-contract        | 배럴에서 `farewell` 노출      | named re-export(`export *` 금지) + 내부 helper 비유출                                 |
| iC  | S4 reuse-first            | `lineItem` 추가               | 기존 `formatCents`(부호+천단위) 재사용 — `toFixed` 재발명이면 실패                    |
| iD  | S5 naming/mirror          | `/products` 라우트 추가       | 형제 라우트 파일 패턴 미러링(레지스트리 인라인 금지)                                  |
| iE  | S8 cause-vs-symptom       | 스케줄러 정렬 버그 수정       | 원인(`byPriority` 비교기) 수정, 증상 패치 아님 + 무관 기존 실패 언급 여부(final text) |
| iF  | S3 test-validity          | 버그 수정 + 회귀 테스트 추가  | 추가된 테스트가 pre-fix 코드에서 실패(fail-first 유효성), post-fix 통과               |
| iG  | filid fractal-boundaries  | cart가 billing 기능 사용      | 형제 fractal의 entry point import(내부 파일 직접 import 금지)                         |
| iH  | filid code-placement      | 두 모듈이 같은 날짜 포맷 필요 | 구현 1곳(LCA 아래), 형제 내부 cross-import 없음, 양쪽 소비                            |
| iI  | seiri code-comments       | 함수 동작 변경                | 문서주석이 현행 스펙으로 갱신, 히스토리 마커(previously/used to) 0건                  |
| iJ  | seiri function-boundaries | 설정 기반 배송비 helper 추가  | 설정을 파라미터로 수취(모듈 상태 직접 import 금지), 파일당 export 1                   |

미커버·한계(보고서에 명기): S6 structure·S7 context-efficiency는 세션 속성이라 단일샷 부적합(기존 결론 유지), 훅 주입 채널은 측정 밖(규칙 파일 채널만 측정 — 사용자의 비용 불만이 곧 이 채널), 컴팩션/장기세션 체제 미도달(d9와 동일 한계).

**실행 매트릭스**: 10 이슈 × {R0×2, R1×3, R2×3} = 80 런(haiku). 프롬프트 = fence + task( + R1/R2만: "먼저 `<run>/.claude/rules/` 아래 문서 전부를 읽고 해당되면 따르라") + "기존 `*.test.js` 수정 금지" + "끝나면 무엇을 바꿨는지 짧게 보고". 피험자 최종 보고문은 `<run>/FINAL.md`로 저장(iE false-done 판정용).

**채택 게이트**(d9 승계): 이슈별 R2 hidden 점수합 ≥ R1 → 해당 규칙 채택. 미달 → 그 규칙만 내용 보강 후 해당 이슈 R2 셀 재실행(1회 반복). R0 고통과(≥5/6 assert) 이슈는 해당 조항의 "모델 기본" 증거로 기록하되, 구조 규칙 조항에만 추가 삭제 근거로 사용.

## 3. 태스크 (검토 가능한 이음새 단위)

**T1 — 하네스 골격 + 픽스처 10종.** 산출: 위 파일 지도의 issues/·prepare.mjs·grade.mjs·README.md. 검증: `node .metadata/rule-bench/grade.mjs --selftest` 가 10 이슈 전부 `base:shown-fail / naive:hidden-fail / correct:all-pass` 출력. 인터페이스(후속 태스크 소비): `prepare.mjs --issue iA --arm R1 --rep 1 --out <scratch>` → 실행 디렉터리 절대경로+프롬프트 stdout JSON; `grade.mjs <runDir>` → `{issue, arm, rep, shown, hiddenPassed, hiddenTotal}` JSON 행.

**T2 — R2 압축 초안 14종 + 암 구성.** 산출: `arms/R1/`(현행 사본), `arms/R2/`(초안 — templates는 아직 미수정, d9 가역성 원칙). R2는 §0의 불변식·KEEP 목록 준수, 파일별 압축 노트(무엇을 왜 지웠나)를 results 초안에 기록. 검증: 불변식 정규식 8종을 grep로 R2 전 파일 통과 + 바이트 절감표(R1 대비).

**T3 — 벤치마크 실행 + 채점.** 산출: 80 런 결과 JSON + `results/2026-08-01-r2.md` 1차 표. 실행: prepare → Agent(haiku) 웨이브(~10/회) → FINAL.md 저장 → grade. 검증: 표의 행 수 80, self-test 재확인 로그 첨부.

**T4 — 반복(조건부).** R2 < R1 이슈의 규칙 보강 → 해당 셀 재실행 → 표 갱신. R0 데이터로 삭제 숙고 목록 확정(조항별: 유지/삭제/보류 + 근거).

**T5 — 채택 + 동기화 + 정본 갱신.** R2' → `plugins/*/templates/rules/` 반영 → `yarn workspace @ogham/seiri build:rules && yarn workspace @ogham/seiri test:run` → filid 동일 → `node .metadata/rule-bench/apply-rules-sync.mjs` → `git diff --stat` 확인 → `.metadata/seiri/03-RULES.md` 개정 노트. 검증: 두 플러그인 test:run green + `.claude/rules`·AGENTS.md·templates 3면 바이트 일치 + 신선한 서브에이전트 정적 리뷰(RULE-REVIEW 6축, 자문).

**T6 — 보고.** results 정본 완성(절감: standing/총량 바이트·추정 토큰, 이슈×암 표, 채택/롤백, 삭제 숙고 목록, 한계) + 대화 요약 + deilen 프리뷰.

## 4. 자기 검토

- 요구→태스크: "짧고 간결한 규칙"=T2/T5, "판정 하네스 설계"=T1, "벤치마크 진행"=T3/T4, "제외는 충분한 숙고"=T4 삭제 숙고 목록+§0 삭제/유지 기준, "최선의 규칙"=T4 반복 게이트. 누락 없음.
- 플레이스홀더 없음 확인: 이슈 표가 오라클 핵심까지 명시, 인터페이스 JSON 스키마 명시, 명령 verbatim.
- 이름/시그니처 일치: prepare/grade 플래그와 T3 사용례 일치. meta.json 스키마와 grade 소비 일치.
- 보수 기본값 선언: 채택은 워킹트리까지(무커밋), 버전 범프는 릴리즈 플로우라 제외(보고서에 후속으로 명기), 훅 주입 채널·S9 decision-trail·paths 스코프 확대 등은 범위 밖(보고서 후속 제안).
