# prawf

Claude Code용 **논문 동료평가(peer review) 멀티에이전트** 플러그인. _prawf_ 는
웨일스어로 "시험·검증·증명"을 뜻합니다.

9인의 심사 페르소나가 학술지 심사위원단처럼 논문을 해체합니다 — 6인의 건전성
(soundness) 심사자가 각 축으로 공격하고, 저자 변호인이 방어하며, 편집장이 최종
판정을 내립니다. 그 결과로 **다각 평가 verdict** 와 **예상 질문 시트**를 돌려줍니다.
논문에 문제가 없으면 그렇다고 말합니다 — **PASS(Accept)** 도 근거에 기반한 정식
판정입니다.

prawf 는 **순수 마크다운**입니다 — MCP 서버·훅·빌드·런타임 의존성이 전혀 없습니다.
평가는 Claude Code 네이티브 팀 도구 위에서 도는 페르소나의 *추론*이며, 외부 조사
(선행연구·사전등록·표절 대조)는 특정 도구에 묶지 않고 capability 로 위임합니다.

## 설치

```bash
/plugin marketplace add vincent-kk/ogham
/plugin install prawf@ogham
```

## 스킬

| 명령                       | 기능                                                          |
| -------------------------- | ------------------------------------------------------------- |
| `/prawf:review`            | 논문 전체 위원회 평가 → verdict + 예상 질문                    |
| `/prawf:simulate-defense`  | 답변 시뮬레이션: 위원회가 질문, 저자가 답변, 코칭 제공         |
| `/prawf:rebuttal`          | 실제 심사평 → 점대점 반박문 + 수정 체크리스트                 |

```bash
/prawf:review                      # 분야 자동 판정 후 전체 패널 평가
/prawf:review --solo               # 빠른 단일 패스 사전 점검
/prawf:review --profile cs-ml      # 분야 프로파일 지정
/prawf:simulate-defense paper.pdf  # 질문 생성 후 모의 답변
/prawf:rebuttal paper.pdf reviews.txt
```

## 동작 방식

편집장(chair)이 논문 분야를 판정·정규화한 뒤, 네이티브 팀으로 학술지 사이클을 돕니다:

```
P0  프로파일·정규화   분야 판정, 프로파일 로드, 공유 좌표계 생성
R1  공격 (병렬)       6인 건전성 심사자 + advisory 파급력 평가관
R2  방어              저자 변호인이 모든 finding 에 점대점 응답
R3  재심 (조건부)     원 심사자가 각 방어의 수용/거부 결정
ADJ 판정              dedup → verdict (Accept / Minor / Major / Reject)
```

**건전성 단독 verdict.** verdict 는 *미해결 건전성* finding 만의 순수 함수입니다.
중요성(신규성·파급력)은 별도로 채점되며 **advisory** 입니다 — 파급력이 낮다는 이유로
거부되지 않습니다. 방어는 **검증 가능한 산출물**(실제 재분석·외부 인용·텍스트 직접
근거)이 있을 때만 finding 을 강등할 수 있어, 위원회가 실제 결함을 말로만 넘어가지
못합니다.

### 심사단

| 라인        | 페르소나                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------- |
| 건전성 (6)  | argument-analyst, methodologist, statistical-auditor, causal-reviewer, bias-grader, integrity-auditor |
| 중요성      | impact-assessor (advisory)                                                                   |
| 방어        | rebuttal-strategist                                                                          |
| 중재        | chair (`--solo` 빠른 패스는 `adjudicator`)                                                   |

### 분야 프로파일

페르소나의 정체성은 분야 무관 *불변 질문*이고, 분야별 프레임워크(EQUATOR, Bradford
Hill, data-leakage 점검, 증명 엄밀성 등)는 **분야 프로파일**이 주입합니다. 내장
프로파일 4종(`natural-science`, `cs-ml`, `math-theory`, `humanities-qualitative`)이
있고, 편집장이 논문 내용으로 어느 것을 쓸지 자동 판정합니다. `--profile <name>` 으로
지정하거나, 프로젝트에 커스텀 `.prawf/profiles/<name>.yaml` 을 둘 수 있습니다. 분야가
불분명하면 잘못 특화하기보다 보편 메뉴로 폴백합니다.

## 산출물

`/prawf:review` 는 `review-report.md`(finding 마다 추적 가능한 verdict)와
`qa-sheet.md`(예상 질문 + 명확한 경우 해결책)를 작성합니다. 모든 finding 은 편집장이
정규화한 논문 스냅샷의 좌표를 인용합니다.

## 문서

- [CLAUDE.md](./CLAUDE.md) — 기여자용 작업 가이드
- English: [README.md](./README.md)
