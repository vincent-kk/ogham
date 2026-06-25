# r-statistics — Dispatcher (상태머신)

`analyze` 스킬이 구현. 상태/전이 규칙은 `skills/analyze/references/state-machine.md`, 결정적 강제는 `assert_analysis_plan` MCP, 상태 영속은 `workspace`. 비결정 위험은 명시적 전이표 + iteration guard로 억제.

**불변 규칙**: 상태 전이는 Dispatcher만. 에이전트는 추천만. Dispatcher는 에이전트만 호출(Skill/MCP 직접 호출은 에이전트가).

## Intent 분류 (deterministic-first)
| intent | 신호 | 경로 |
|--------|------|------|
| `full-analysis` | 데이터 + 가설/질문 + 분석·비교·모델 요청 | 전체 파이프라인 |
| `partial-step` | "그래프만", "정규성만 검정", "Table 1만" | 해당 스킬 직접 |
| `troubleshoot` | R 에러·스택트레이스·실패 job | r-expert 직행 |
| `methodology-query` | "어떤 검정?", "t-test 적절한가" (실행 요청 없음) | statistician 직행 |
| `needs-clarification` | 데이터만 있고 질문 없음 등 | 사용자에게 질문 |

## 상태 (codex 15 → 실용 병합 10)
`INTAKE · CLASSIFY · STATISTICIAN_PLAN · ASSERT_PLAN · R_EXECUTION · VALIDATION · REPORTING · COMPLETE` (+ `FAILED` · `BLOCKED_NEEDS_USER`).
(codex의 `METHODOLOGY_QUERY`/`TROUBLESHOOT`/`PARTIAL_STEP`는 CLASSIFY의 종결 분기로, `HUMAN_CONFIRM_*`는 별도 상태가 아니라 **interactive 모드의 checkpoint 동작**으로 흡수.)

## 전이표
| From | Event / Guard | To | Action |
|------|--------------|----|--------|
| INTAKE | request | CLASSIFY | normalize, bind workspaceId |
| CLASSIFY | full-analysis | STATISTICIAN_PLAN | — |
| CLASSIFY | partial-step | (해당 스킬) → COMPLETE | 최소 경로 |
| CLASSIFY | troubleshoot | (r-expert) → COMPLETE | — |
| CLASSIFY | methodology-query | (statistician) → COMPLETE | — |
| STATISTICIAN_PLAN | SAP 작성 | ASSERT_PLAN | statistician 호출 *(interactive: SAP 제시·대화)* |
| ASSERT_PLAN | pass | R_EXECUTION | — |
| ASSERT_PLAN | hard_block · (auto)soft_warning | STATISTICIAN_PLAN | methodologyIter++ |
| R_EXECUTION | success | VALIDATION | 아티팩트 수집 |
| R_EXECUTION | recoverable error | R_EXECUTION | rRepairIter++ (r-expert 재시도) |
| R_EXECUTION | unrecoverable | FAILED | — |
| VALIDATION | ok | REPORTING *(또는 결과 반환)* | *(interactive: 결과 대화→품질↑)* |
| VALIDATION | block | STATISTICIAN_PLAN | validatorIter++ |
| REPORTING | 완료 | COMPLETE | Quarto 산출 |
| (any) | guard 초과 | FAILED | 사유 보고 |
| (any) | 진동·교착 | BLOCKED_NEEDS_USER | 사용자 결정 요청 |

## Iteration guard (다층)
`methodologyIter ≤ 3` · `rRepairIter ≤ 3` · `validatorIter ≤ 2` · `totalTransitions ≤ 25`. 초과 → `FAILED`.

## 발산 처리
| 신호 | 동작 |
|------|------|
| 동일 `assert` 실패 2회 | 중단 → BLOCKED_NEEDS_USER |
| validator 동일 이슈 반복 block | FAILED |
| statistician 비양립 기법 진동 | BLOCKED_NEEDS_USER |
| r-expert가 SAP 동등 변경 시도 | 차단 (기법 변경은 statistician만) |
| 새 가설이 현 SAP와 모순 | SAP 무효화 → STATISTICIAN_PLAN 재시작 |

## 실행 모드 (`modes.md`)
| | `interactive` (기본) | `--auto` (pipeline) |
|--|--------------------|---------------------|
| hard gate (assert hard_block) | 차단 → 재선택 | 차단 → 재선택 |
| soft warning | **사용자 대화로 개선** (진행 허용) | **엄격 재선택** (무인) |
| checkpoint (SAP·결과) | 제시 후 대화 | 자동 통과 |
| 종료 | 결과 반환·설명 우선 | 고품질 루프 수렴 후 산출 |

## Hand-off (immutable · audit)
Dispatcher가 SAP·아티팩트 참조·사전 결정(`DecisionRecord[]`)을 에이전트에 전달, 에이전트는 구조화 델타 반환. 모든 전이·결정은 audit trail에 기록(재현성).
