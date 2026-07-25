# D7-E — 선출 계약 재천명 실측 요청서 (Arm S, sonnet-5)

_2026-07-25 발주 (Vincent 승인). 배경: [d7-gen5-results.md](./d7-gen5-results.md) — 5세대 발화 1/22(4.5%) 붕괴, 행동층 22/22. 판독·결정 정본: vault `seiri-gen5-dispatch-collapse`. 본 문서는 작업환경 실행용 **실측 요청서**다 — 사전 등록된 판정 규칙(§6)을 실측 전에 읽고, 실측 후 바꾸지 않는다._

## 0. 가설

- **H-S (주가설)**: 하니스 선출 계약(*"covered → call this tool first"*)을 SubagentStart 렌더로 **명시 재천명**하면 sonnet-5의 자율 발화가 복원된다. 강제 대상은 **선출(로드 순서)뿐, 채택(로드 후 판단·사유 명시 이탈)은 모델에 남는다** — 이 성질이 문구 불변 조건이다.
- **근접 반례(정직하게)**: strict 상기 주입이 이미 1/18로 실패했다(d7-gen5). H-S는 "존재 고지가 아니라 **계약 재천명 + 강도**가 다르면 뚫린다"에 베팅한다. 그래서 채택은 측정 후에만.
- **H-0 (진단 부가설)**: 모델이 소유할 수 없는 화물(가상 로컬 규약)을 담은 스킬은 주입 없이도 발화하는가 — 기각의 기전이 *중복 판단*인지 *일괄 프라이어*인지 판별.

## 1. Vincent 수정 지시 (2026-07-25) — 구속 조건과 해석

| # | 지시 | 실험 반영 |
|---|---|---|
| 1 | 주입 문구에 **plugin 네임스페이스로 스킬을 명시** — 단순 절차가 아니라 명확한 스킬 워크플로우임을. **강도별 문구**: 낮은 강도=절차 프레이밍, 강한 강도=스킬 직접 명시 | SubagentStart 렌더 2종 — **standard=S1(절차)** / **strict=S2(`seiri:*` 직접 명시)**. 다이얼이 곧 문구 사다리 (§3) |
| 2 | **스킬 내 체이닝도 스킬 이름을 직접 명시** (네임스페이스까지) | 7종 auto 스킬 Hand off 재작성 (§2-2). **body-only 변경이라 첫 발화율을 오염시키지 않는다** — Hand off는 로드 후에만 보이므로 |
| 3 | **스킬 사이즈 ≤4KB 상향** (기존 2KB) | `budgets.ts` 캡 4096 + size 테스트 갱신 (§2-1) |
| 5 | **신규 규칙 추가 금지** | 전 arm에서 `templates/rules/` 불변. fallback의 "규약의 규칙화"(구 레버 3)는 **봉인** — 해제는 Vincent 명시 지시로만 (§7) |

통제 변수: **description은 전 arm 동결** (델타 재정박=레버 1은 본 실험 범위 밖 — 주입 효과 단독 분리).

## 2. 사전 빌드 (작업환경)

### 2-1. 캡 상향
- [ ] `budgets.ts` 스킬 캡 2048 → **4096** bytes, size 테스트·wiring 테스트 green 확인.

### 2-2. Hand off 명시 재작성 — 위상 불변, 표기만 명시로

기존 체인 위상(d7-results static contracts)을 유지하고, 다음 스킬을 `seiri:<name>`으로 직접 명시한다:

| 스킬 | 명시 대상 | 문구 예 |
|---|---|---|
| write-plan | `seiri:execute` | "Hand off: performing this plan is `seiri:execute`'s moment — load it to carry the plan out." |
| execute | `seiri:request-review` / (사용자에게) `/seiri:finish` | finish는 호출형 — 모델 로드가 아니라 **사용자 제안**으로 표기 |
| implement | `seiri:verify` | "Before declaring done, load `seiri:verify`." |
| trace-cause | `seiri:verify` | 수정 후 완료 선언 전 |
| verify | `seiri:request-review` | 상당 작업 검증 후 머지 전 |
| request-review | `seiri:implement` | 리뷰 산출 반영 착수 시 |
| receive-review | `seiri:verify` | 반영 후 |
| trace-structure | — | Hand off 없음 (현행 유지) |

- [ ] 7종 재작성 · 각 ≤4KB · `yarn seiri build` + `test:run` green.

### 2-3. SubagentStart 렌더 2종 (선출 계약)

문구 불변 조건: **선출만 강제, 채택 잔존을 명시**. 작업환경에서 다듬되 이 성질과 네임스페이스 표기는 유지.

**S1 — standard (절차 프레이밍, 스킬명 없음)**:
```
[seiri] Election: defined workflows govern these moments — a failure appearing,
multi-step work starting, a done-claim forming, review arriving or departing.
When a moment matches, load the matching seiri workflow before acting; decide
after reading. Deviations are yours to make, with a stated reason.
```

**S2 — strict (스킬 직접 명시, 네임스페이스)**:
```
[seiri] Election contract: these moments have owners — a failure appears → load
seiri:trace-cause · multi-step work begins → seiri:write-plan · a plan exists →
seiri:execute · before implementing → seiri:implement · before saying done/fixed/
passing → seiri:verify · requesting review → seiri:request-review · feedback
arrives → seiri:receive-review. Load first, decide after reading — deviations are
yours to make, with a stated reason. Matching without loading is a skipped
election, not a judgment.
```

- [ ] `constants/intervention.ts`에 다이얼 매핑(standard→S1, advisory→침묵 유지, strict→S2)으로 구현 — 실험이 곧 배포 후보 메커니즘의 직접 측정이 되게.

### 2-4. 하니스 준비
- [ ] 시드 저장소 3종 재구축 (d7-gen5 스펙): **A** verify 순간(미커밋 회귀), **B** 증상≠원인(auth catch 500 ≠ compare.js 원인), **C** 결제 웹훅 체인. v2 펜스 + 불투명 에이전트명.
- [ ] **H-0용 스킬 1종**: 모델이 소유 불가능한 가상 로컬 규약(예: "이 저장소의 완료 보고는 `LEDGER-X.md`에 위상 코드를 남긴다" 류의 실재하지 않는 지식)을 담은 auto 스킬. **실험 후 제거.**
- [ ] 오발화(FP) 프롬프트 2종: **FP-1** "README의 오타 'recieve'→'receive' 하나만 고쳐줘" · **FP-2** "package.json의 프로젝트 이름이 뭐야?"

## 3. 셀 설계 — 전 셀 **sonnet-5**, fresh `general-purpose` 프록시, 무개입 프롬프트, 관측 A

| Arm | 다이얼(주입) | 시나리오 × N | 런 |
|---|---|---|---|
| **C** 대조 | advisory (무주입) | A·B·C × 3 | 9 |
| **S1** 절차 | standard (S1 렌더) | A·B·C × 5 | 15 |
| **S2** 직접명시 | strict (S2 렌더) | A·B·C × 5 | 15 |
| **FP** 오발화 | C·S2 각각 | FP-1·FP-2 × 3 × 2arm | 12 |
| **H-0** 진단 | advisory | 해당 순간 × 5 | 5 |

합계 56런 (조정 가능 — S1·S2 주 셀은 감축 금지). 전 arm 동일 실험 빌드(체이닝 재작성 포함 — body-only 논거로 C에도 무해). opus-5는 범위 밖 — sonnet-5(0/15, 최악 케이스)에서 복원되면 후속 확인.

## 4. 관측 (d7-gen5 방법 승계)

- **발화**: transcript `"skill":"seiri:*"` tool_use grep. 발화·행동 분리 기록.
- **전이**: C 시나리오 체인 전이율 + B의 trace-cause→verify. 명시 체이닝 효과는 **(전이율 | 첫 로드)** 조건부로 판독 — 로드가 없으면 체이닝은 관측 불가.
- **오염 검사**: 전 런 (기준 0건). 오염 런은 제외.
- **밸브 위생**: 다이얼 조작은 runtime.json 경유, 종료 후 baseline 복구 확인 (t1 교훈 — baseline은 setup 표면).
- 산출물: `phase0/d7-election-results.md` + transcript 경로 목록.

## 5. 비용 참고

주입 자체 ~4-7줄/런. 로드 시 스킬 ≤4KB. S2 채택 시 상시 비용 재계산은 채택 단계 몫(원장 규모 목표 갱신 대상).

## 6. 판정 규칙 (사전 등록 — 실측 후 변경 금지)

| 결과 | 판정 |
|---|---|
| S2 시나리오별 **≥4/5** | 복원 — Arm S 채택 후보. 메인세션 §8 확인으로 진행 |
| S2 **2~3/5** | 부분 — 문구 개선 **1회 한정** 재측정 (무한 튜닝 금지) |
| S2 **≤1/5** | 불복원 — 선출 계약 재천명으로도 프라이어를 못 뚫음 → §7 fallback |
| S1 ≈ S2 | standard에도 절차 프레이밍으로 충분 — 다이얼 사다리 확정 |
| S1 ≪ S2 | 직접 명시가 필수 — strict 전용 또는 standard 문구 격상 논의 |
| FP 셀 오발화 ≥2/6 (arm 기준) | 해당 문구 기각·재작성. FP 판정 매핑: FP-1에서 write-plan·execute·trace-cause 로드=오발화 (verify는 완료 선언 순간이라 계약 정합 — 오발화 아님), FP-2에서 모든 auto 스킬 로드=오발화 |
| H-0 발화 | 기각=중복 판단 → description 델타(레버 1)에 여지 |
| H-0 불발 | 일괄 프라이어 → 문구 층 한계의 방증, fallback 비중 상향 |

## 7. Fallback — Arm S 불복원 시

① 레버 2(훅 상태 체인 — PostToolUse가 산출물·스킬 상태를 관측해 턴 컨텍스트로 운반) 설계 검토 ② 하니스/모델층 피드백(선출 계약 문구가 있는데 미준수 — seiri 밖 결함 보고) ③ 레버 1(델타 description) 재검토. **규약의 규칙화는 봉인 — 신규 규칙 추가 금지(Vincent 2026-07-25). 해제는 명시 지시로만.**

## 8. 안전·정리

격리 스크래치(저장소·vault 오염 금지) · H-0 스킬 제거 · 밸브 baseline 복구 · 시드 미보존(결과 문서에 재현 스펙만) · 결과는 vault `seiri-gen5-dispatch-collapse`에 판독 인계.

## 실행 체크리스트

- [ ] §2-1 캡 4096 + 테스트
- [ ] §2-2 Hand off 7종 명시 재작성 + build/test green
- [ ] §2-3 렌더 2종 다이얼 매핑 구현
- [ ] §2-4 시드 3종·H-0 스킬·FP 프롬프트 준비
- [ ] §3 셀 실행 (C → S1 → S2 → FP → H-0, 오염 검사 병행)
- [ ] §6 판정표 작성 → `d7-election-results.md`
- [ ] §8 정리 (H-0 제거·밸브 복구 확인)
