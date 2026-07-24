# 규칙 정적 리뷰 프로토콜 (B)

> seiri 규칙의 **의미론적 품질**을 LLM 이 평가하는 설계-시점 리뷰. 기계적
> 드리프트 가드(`plugins/seiri/src/__tests__/ruleInvariants.test.ts`)가 못
> 보는 것 — 규칙이 **타당하고·정합적이고·모순 없는가** — 를 다룬다.
> 비결정적이라 **CI 게이트가 아니라 자문 리뷰**다(코드 리뷰처럼 사람이 최종 판정).

## 세 축의 분담

| 축                  | 무엇을                            | 도구                            | 성격                    |
| ------------------- | --------------------------------- | ------------------------------- | ----------------------- |
| 자기 준수(계약)     | 임계·러너 금칙 · D8 관용구 · hash | `ruleInvariants.test.ts`        | 기계 · 결정적 · 매 커밋 |
| **의미 품질(정적)** | 타당성 · 정합성 · 모순            | **이 프로토콜(B)**              | LLM · 비결정 · 변경 시  |
| 행동 효능(동적)     | 규칙이 행동을 바꾸는가            | Phase 0 micro-test · 10이슈 A/B | LLM · 실하니스          |

B 의 신규 기여는 **정적 6축**뿐 — 동적 효능은 이미 micro-test 가 맡는다.
"규칙이 좋은가" 를 문자열·줄 수로 재려는 시도는 범주 오류이므로 B 가 있다.

## 루브릭 — 정적 6축

각 규칙 안에서, 그리고 규칙 사이에서 판정한다:

1. **우선순위 타당성** — 사슬이 출처를 옳게 서열화하고, 주장한 대로 실제로 양보하는가.
2. **형식 근거 정직성** — `rests on <property>` 가 진짜 보편 속성인가, 숨긴 가정인가.
3. **내부 정합성** — 헤드라인·불릿·예시가 서로 모순 없는가.
4. **교차 모순** — 형제 seiri 규칙·`filid_fca-policy` 와 **같은 상황에 다른 답**을 주는가. 주면 우선순위 사슬이 해소하는가.
5. **행동 유도력** — `Ask yourself` 가 실제 결정 절차인가, 모호한가.
6. **반증 정직성** — `wrong for you if:` 가 진짜 예외 맥락인가, 무화과잎인가.

## 러너 — 독립성이 핵심

설계 세션의 편향을 피해 **신선한 판정자**로 돌린다:

- `/cennad:crosscheck` — 멀티 프로바이더 교차(Phase 0 에서 쓴 방식). cross-model 다양성이 최선. agy 불안정 시 cennad claude/codex.
- 또는 **신선한 서브에이전트** — 깨끗한 컨텍스트. 같은 모델이나 세션 편향 없음, 외부 CLI 무의존.

## 실행 시점 · 출력

- **시점**: 규칙 추가·문구 변경 시, 머지 전.
- **출력**: 규칙별 판정(sound / concerns / issue) + **근거 인용**(문제 줄) + 교차 모순 목록.
- **자문**: 판정은 red/green 게이트가 아니라 사람이 읽고 최종 결정한다.

## 검증 매트릭스 연결

TODO "전 단계 관통 검증" 의 **적대 검토(`/cennad:crosscheck`)** 행이 이 프로토콜로 구체화된다.

## 첫 실행 (2026-07-23, 신선한 서브에이전트)

깨끗한 컨텍스트 서브에이전트로 8규칙 + `filid_fca-policy` 를 정적 6축 리뷰. 인용 증거는 원문 대조 검증됨.

- **판정**: SOUND 6 (agent-legible·test-validity·naming·structure·context-efficiency·cognitive-discipline) · CONCERNS 2 (public-contract·reuse-first).
- **진짜 하드 모순 없음.** 방향-임계값 filid 위임 축은 전부 정합(structure·test-validity 모범), acyclicity 는 filid 문언까지 일치.
- **최상위 이슈(열림)** — `reuse-first §3` _"Leave pre-existing dead code in place"_ ↔ `public-contract §1` _"leftover (remove it)"_ 가 **기존 미소비 export** 라는 같은 상황에 정반대 처분. 동일 레벨 규칙이라 선례 사슬이 해소 못 하고, 세트가 다른 곳에선 성실히 교차 참조하는데 이 지점만 상호 참조 부재 → 문자적 준수(cognitive-discipline §4) 에이전트를 오도 가능.
  - 처방(제안): public-contract §1 의 "remove it" 을 **your change's scope**(신규/직접 orphan 시킨 심볼)로 한정 + reuse-first §3 상호 참조.
- **경미 2**: public-contract 형식 근거("a distinction exists between public and internal")가 자신의 single-file falsification 과 긴장(→ "with a module system" 한정); reuse-first §1 의 실하중 가정("code already exists")이 명시 근거("a change is a diff")와 불일치. 둘 다 자기 문서 내에서 완화·공개돼 실질 위험 낮음.
- **처리 (적대적 역검증 후, 2026-07-23)** — 발견 1·2 수용·적용, 발견 3 기각:
  - **1 수용(완화)**: "정반대"는 과장(미소비 export ≠ dead code — §1 자신이 외부 콜러 불가지 인정)이나, §1의 무한정 "remove"가 문자적 준수 에이전트를 오도할 잔여 위험은 실재. → `public-contract §1` 의 remove 를 **내-변경 스코프**로 한정 + `seiri_reuse-first §3` 참조(§3 무수정, 두 규칙 정렬).
  - **2 수용**: 형식 근거를 "every codebase **with a module system**" 로 한정(Applies-when·falsification 과 정합).
  - **3 기각**: 근거 _"a change … answers a request"_ 가 §1("기존 답 먼저 찾기")을 느슨히 뒷받침하고 greenfield falsification 이 조건성을 이미 공개 → 논쟁적, 검증본 훼손 근거 부족.
  - **검증**: `sync-rule-hashes` 재주입 · seiri `test:run` 51 green(hash-fresh·size·D8).
