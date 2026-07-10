# cross-review — Multi-Perspective Consensus Code Review

## Purpose

다관점 합의 코드 리뷰 스킬. 의장(메인 세션)이 위원회를 선출하고, 기술 측정을 evidence 서브에이전트에 위임한 뒤, 페르소나 의견 1라운드를 병렬 수집하고, 차단급 발견 전체에 적대적 검증(CONFIRMED/PLAUSIBLE/REFUTED)을 걸어 오탐을 기각하고 의견 충돌을 조율한 후 판정을 도출한다.

## Structure

| 경로                 | 역할                                                                    |
| -------------------- | ----------------------------------------------------------------------- |
| `SKILL.md`           | 5단계 워크플로우 메인 프롬프트                                          |
| `contracts.md`       | 위원회 매핑, 의견 스키마, 심각도 게이트, 검증 verdict ladder, 판정 도출 |
| `templates.md`       | review-report / fix-requests / advisory ledger / PR comment 포맷        |
| `phases/evidence.md` | evidence 서브에이전트 지침 (측정 전담, full/half/batch 스코프)          |
| `reference.md`       | 참조 문서 인덱스                                                        |
| `calibration/`       | 검증기 회귀 픽스처 (FPR·FNR·인플레이션·claim 오판정 측정)               |

페르소나는 `../../agents/<persona-id>.md` 로 정의된다.

## Conventions

- 위원회: TRIVIAL=adjudicator, LOW=2, MEDIUM=4, HIGH=6 (`--solo` 로 adjudicator 강제)
- 페르소나·검증자는 병렬 foreground `Agent` 호출 — 백그라운드 팀·라운드·정족수 기계 없음
- 산출물: session.md, verification.md, opinions/<persona>.md, review-report.md, fix-requests.md

## Boundaries

### Always do

- 신규 specialist 페르소나 추가 시 세 곳 동시 수정: `src/types/review.ts` + `electCommittee.ts` + `agents/<id>.md`
- 심각도 게이트·verdict ladder·판정 규칙 변경 시 `contracts.md` + 에이전트 7종 동시 갱신 후 `calibration/` 패스 실행
- 산출물 포맷 변경 시 `templates.md` + resolve/revalidate 소비처 동기화

### Ask first

- 위원회 tier 구성 변경 (`electCommittee.ts` 와 동기 필요)
- 검증(Verify) 패스 축소·제거 (오탐 방어선)
- 판정 도출 규칙 변경 (`contracts.md` Verdict Derivation)

### Never do

- 의장이 MCP 측정 도구 직접 호출 (verification.md 인용만; 북키핑 2종 예외)
- 위원회 의견 파일 없이 판정 작성 (프로토콜 위반 — INCONCLUSIVE 만 합법)
- 차단급 발견을 검증 패스 없이 fix-requests.md 에 승격
- TRIVIAL tier 에 specialist 페르소나 배치 (adjudicator 전용)
