# r-statistics — 설계 메타데이터

> **`r-statistics` = Claude를 도메인 중립 "통계 전문가"로 만드는 Claude Code plugin.**
> 유일한 도메인은 통계 방법론 그 자체 — 의료·물리·화학·공학·사회과학 등 어떤 응용 도메인에도 앵커링하지 않는다.

이 디렉토리는 `r-statistics` 플러그인의 **설계 명세(spec)** 다. 실제 구현 전 단계의 아키텍처 문서이며, deilen `.metadata/` 패턴을 따른다.

## 입력 / 출력

- **입력**: 데이터셋 + 가설/분석 목표
- **출력**: 통계적으로 검증된 결과 + 재현 가능한 R 코드 + 시각화 + 해석

## 문서 인덱스

| 문서                                 | 내용                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| [architecture.md](./architecture.md) | 3-Layer 아키텍처, 디렉토리 구조, FCA·코드 규약                                                        |
| [mcp-tools.md](./mcp-tools.md)       | MCP 도구 4종 스펙 (`run_r`·`get_r_job`·`cancel_r_job`·`assert_analysis_plan`) + TypeScript 인터페이스 |
| [skills.md](./skills.md)             | 노출 스킬 6종 + `methods/` lazy 리소스 + `shared/`                                                    |
| [agents.md](./agents.md)             | 에이전트 3종 (통계학자·R전문가·통계방법론검증가)                                                      |
| [dispatcher.md](./dispatcher.md)     | 상태머신 오케스트레이션, intent 분류, 실행 모드                                                       |
| [assert-rules.md](./assert-rules.md) | `assert_analysis_plan` 표준 룰셋 (기법별 가정 매핑)                                                   |
| [spec.md](./spec.md)                 | 컴포넌트 책임, 데이터 흐름, 비채택 결정                                                               |
| [roadmap.md](./roadmap.md)           | 남은 구현 디테일 / 이후 항목                                                                          |

## 3-Layer 한눈에

```
[Dispatcher]  analyze 스킬 — 상태머신 오케스트레이션 (intent 분류 + 전이 + 모드)
[Agent]       statistician(WHAT) · r-expert(HOW) · methodology-validator(VALID)
[Skill]       analyze · data-preparation · assumption-check · visualization · reporting · setup
                 └ lazy: methods/{technique}/ · shared/contract.R
[MCP]         run_r · get_r_job · cancel_r_job · assert_analysis_plan  (도메인 무지·stateless)
[R-CLI]       Rscript (temp 격리 + 명령어 게이트 + --vanilla + renv)
```

## 핵심 원리

비결정 LLM(Agent)을 **결정적 상태머신(Dispatcher) + 결정적 실행(MCP)** 이 위아래로 감싼다.

- `interactive`(기본): 결과 반환·설명 우선, hard 게이트만 차단, 품질 향상은 사용자 대화로
- `--auto`(pipeline): 무인 + 엄격 기준 자동 적용 + 고품질 루프

## 코드 규약 (구현 시)

- **FCA** (Fractal Context Architecture): 프랙탈 분리 + 부속품 격리 + 상향식 지연 로딩
- **1함수 1파일** (`operations/*.ts`)
- **모든 문자열 리터럴은 상수** (`src/types/enums.ts` `as const`, `src/constants/messages.ts`)
- **hook 미사용**
