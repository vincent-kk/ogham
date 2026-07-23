# D9 규칙 슬리밍 — 작업환경 에이전트 인계 프롬프트

> **인계 대상**: ogham 작업환경 에이전트(실하니스 실행 담당). **설계·재단선·프로토콜은 확정됨**(2026-07-24 Vincent 동의). 이 문서만으로 착수 가능하도록 자족적으로 쓴다. 설계 근거의 정본은 vault `04_Action/projects/seiri-rule-slimming-d9`.
>
> **분담**: 실제 규칙 압축(`03-RULES.md` 편집)·두 A/B 실행은 이 트랙. vault 세션(나오)은 판독·기록. 결과는 vault로 인계한다.

---

## 0. 배경 한 줄

D7(발화 94%)과 효능 A/B(opus lift 0·haiku +20pp)가 규칙 슬리밍 국면을 열었다. 목표: **상시 규칙을 얇게 하되 성능 손실 0** + **고급 모델에서의 값을 다단계에서 측정**.

## 1. 재단선 (확정 — 재론 불필요)

| 규칙 | 처방 | 필수 제약 |
|---|---|---|
| S1 `agent-legible` | **lite** | **부연부 레시피 템플릿(`loaded by <mechanism>; …`) 보존** — 처치 수렴이 여기서 나왔다. 헤드라인만 남기면 구속력 소멸 |
| S2 `public-contract` | **lite** | 3-reason 코어(wildcard 금지 근거) 보존 |
| S4 `reuse-first` | **lite** | **§1 reuse 우선순위 5단계 코어 보존** — haiku +20pp의 원천. 건드리면 그 값 손실 |
| S5 `naming` | **lite** | 발견 위임(sibling mirroring) 코어 보존 |
| S3 `test-validity` | **유지(무수정)** | 프로세스 규칙 — 다단계 순간 겨냥, 미측정. 손대지 않는다 |
| S7 `context-efficiency` | **유지(무수정)** | 동일 |
| S8 `cognitive-discipline` | **유지(무수정)** | 금지+합리화표는 작동 기제 — 삭감 시 역효과(실측) |

**lite 원칙**: 각 절에서 **볼드 명령 + Ask yourself + 레시피/핵심 1불릿**만 남기고 정당화·부연·설명을 덜어낸다. **감량 상한 -27%(단어, 2026-07-24 실측)** — 그 이상은 의미·레시피가 깨진다(40~50% 목표는 폐기). **레시피(구체 형태를 지정하는 부분)는 절대 지우지 않는다** — 그게 구속력의 원천이고, 상한이 낮은 것 자체가 규칙 대부분이 이미 레시피였다는 증거다.

> **27%는 안전 상한이 아니라 A/B 시작점이다.** "레시피가 안 깨지는" 상한(에이전트 판단)과 "성능이 안 떨어지는" 상한(§2-1 A/B)은 다르다 — 27%에서 hidden-pass가 떨어지면 더 보수적으로(예: -18%) 물러선다.

## 2. 검증 — 두 개의 sonnet A/B (모델 고정: sonnet)

### 2-1. full vs lite (성능 가드) — 구조 규칙

- 효능 A/B와 같은 5이슈 방법론(shown-fail 과제 + hidden 오라클). fenced. **sonnet** as-is 대신 arm = **full 8규칙** vs **lite(구조 4종 lite + 프로세스 3종 full)**.
- **채택 조건**: lite hidden-pass ≥ full hidden-pass (동률 이상). **미달 규칙은 개별 롤백**(full 복귀).
- 기록: hidden-pass 표 + 토큰 절감폭.

### 2-2. 다단계 신설 (고급 모델 이득) — 프로세스 규칙

- **지금까지 A/B가 도달 못 한 곳을 만든다**: 긴 세션·다단계·다파일 과제(가능하면 컴팩션 유발). 프로세스 규칙(S3·S7·S8)이 겨냥하는 순간 — 거짓 done·증상 패치·미검증 주장 — 에 실제 도달.
- sonnet as-is(규칙 없음) vs to-be(프로세스 3규칙 배포). 지표: 거짓 done 발생·증상 패치·미검증 주장의 빈도(위반의 관측 흔적).
- 이게 "고급 모델 이득"을 재는 유일한 실험. lift 유무를 정직하게 기록.

## 3. 착수 순서

```
① 구조 4종(S1·S2·S4·S5) lite 초안 — 레시피 보존 원칙(§1)
② 2-1 성능 가드 A/B (sonnet) — 롤백 규칙 판정
③ 통과분만 templates/rules/ 갱신 + yarn seiri build (sync-rule-hashes) + test:run
④ 2-2 다단계 A/B (sonnet) — 병행 가능
⑤ 결과를 vault로 인계 (나오가 판독·원장 갱신)
```

## 4. 격리·안전 규약 (d7-results 교훈)

- **cwd fence 필수** — 모든 A/B는 격리된 스크래치 저장소에서. 프롬프트에 "이 폴더는 격리된 저장소야. 이 폴더 안에서만 작업하고 바깥 파일은 읽지 마." 삽입(d7-results가 실증한 fence). ogham 저장소 오염 금지.
- **무개입** — A/B 프롬프트에 규칙/스킬 언급 금지(관측자 효과).
- **가역성** — lite는 full을 지우지 말고 별도 생성 후 A/B. 통과분만 교체. `rule-lint`(B1·B5·B6·임계 금칙)는 lite판에도 통과해야 한다.

## 5. 결과 인계 형식 (vault로)

- 2-1 표: 규칙별 full/lite hidden-pass·토큰·채택/롤백.
- 2-2: 다단계 lift 유무 + 관측 흔적.
- 최종 재단선 확정본(롤백 반영).
- 반영처: vault `04_Action/projects/seiri-rule-slimming-d9`(판독) → 원장 D9 갱신.

## 관련

- 설계 정본: vault `04_Action/projects/seiri-rule-slimming-d9`
- 입력 데이터: `phase0/d7-results.md` · `phase0/SYNTHESIS.md`
- 규칙 전문: `03-RULES.md` · 상용구/골격: `03-RULES.md` 상단
