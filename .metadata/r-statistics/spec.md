# r-statistics — Spec (책임 · 데이터 흐름 · 비채택)

## 컴포넌트 책임

| 컴포넌트                           | 위치                                | 책임                                                                             |
| ---------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| **analyze 스킬** (Dispatcher)      | `skills/analyze/`                   | intent 분류 → 파이프라인 상태 전이 → 에이전트 오케스트레이션 → 모드별 checkpoint |
| **statistician 에이전트**          | `agents/statistician.md`            | 데이터+가설 → 기법 선택(결정트리), 분석계획(SAP) 작성 — **WHAT**                 |
| **r-expert 에이전트**              | `agents/r-expert.md`                | R 코드 생성·`run_r` 실행·트러블슈팅, R 공식문서 참조 — **HOW**                   |
| **methodology-validator 에이전트** | `agents/methodology-validator.md`   | SAP 부합성·다중비교 전략·결과 타당성 (soft) — **VALID**                          |
| **data-preparation 스킬**          | `skills/data-preparation/`          | 로드(fread/arrow)·프로파일·정제·결측 대치                                        |
| **assumption-check 스킬**          | `skills/assumption-check/`          | 정규성·등분산·독립성 검정 → assert 입력 아티팩트 생성                            |
| **visualization 스킬**             | `skills/visualization/`             | ggplot2 디바이스 보일러플레이트 (분포/박스/산점/생존/forest)                     |
| **reporting 스킬**                 | `skills/reporting/`                 | Table 1·효과크기·다중비교 보정 → Quarto(DOCX/HTML/PDF)                           |
| **r-setup 스킬**                   | `skills/r-setup/`                   | R 설치 확인 + 환경별 가이드 + 동의 기반 설치 실행                                |
| **run_r**                          | `src/mcp/tools/runR/`               | 크로스플랫폼 Rscript 실행, 아티팩트 수집, 실행 안전 게이트                       |
| **assert_analysis_plan**           | `src/mcp/tools/assertAnalysisPlan/` | 통계적 hard gate (기법↔가정 결정론적 검증)                                       |
| **workspace (core)**               | `src/core/workspace/`               | temp 격리·아티팩트·세션 상태 영속                                                |
| **rRuntime (core)**                | `src/core/rRuntime/`                | Rscript 탐색·spawn·인코딩(UTF-8/CP949)                                           |

## 데이터 흐름 — full-analysis (`interactive` 기본)

```
1. 사용자: "이 데이터로 가설 검정해줘" (+ 데이터 경로)
2. analyze(Dispatcher): intent=full-analysis → 상태머신 진입
3. → data-preparation 스킬: run_r(로드·프로파일) → dataset_profile 아티팩트
4. → statistician 에이전트: profile+가설 → 기법 선택 + SAP
5. → assumption-check 스킬: run_r(가정검정) → assumption 아티팩트
6. → assert_analysis_plan(MCP): SAP+assumption 검증
      ├ hard 위반 → 차단, statistician 재선택 (루프)
      └ pass → 진행
7. → r-expert 에이전트: methods/{기법}/template 기반 R 코드 → run_r → result/plot 아티팩트
8. → methodology-validator 에이전트: soft 검증 → 경고/권고
9. → 결과 반환·설명 (interactive: 여기서 사용자와 대화로 품질 향상)
10. (사용자 요청 시) reporting 스킬: Quarto → DOCX/HTML/PDF
```

## 데이터 흐름 — `--auto` (pipeline)

6·8단계의 hard/soft 게이트를 **무인 + 엄격**하게 자동 적용. validator block / assert fail 시 statistician 재선택 루프를 **iteration guard 한계까지 자동 수렴**(checkpoint에서 사용자 대기 없음). 한계 초과 시 `FAILED` 상태로 종료하며 사유 보고.

## 아티팩트 계약

모든 R 실행은 `ARTIFACTS_DIR`에 산출물 + `manifest.json`(스키마·결과·가정 소비 내역) 기록. `run_r`은 선언된 디렉토리에서만 수집(symlink 탈출 거부·해시·확장자 화이트리스트). 상세 [mcp-tools.md](./mcp-tools.md).

## 비채택 (Explicit Non-Adoption)

| 결정           | 비채택                                 | 이유                                                                                                                                                                                                                   |
| -------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 도메인 특화    | 의료/임상 전용 로직·어휘·규제 게이트   | **도메인 중립**이 정체성. 의료는 적용 사례일 뿐                                                                                                                                                                        |
| 가정 위반 처리 | 비모수/Welch **자동 coercion**         | 은밀한 분석 변경 = 투명성·재현성 위배. statistician 재선택으로 명시                                                                                                                                                    |
| 샌드박싱       | Docker/컨테이너 격리                   | 미채택(사용자 결정). 정적 명령 게이트는 best-effort — 임의 파일 쓰기·dual-use URL 리더는 봉쇄 못 함. blast radius 는 cwd 격리 + env allowlist(시크릿 비노출)로 축소, 잔여 위험 수용. 완전 격리 필요 시 OS 레벨 재검토. |
| R 패키지       | 동적 설치(pak/renv install at runtime) | 네트워크 차단과 모순. 사전구축 환경 + 화이트리스트 + renv lockfile                                                                                                                                                     |
| R 실행         | Rserve 등 임베딩                       | 단순 `Rscript` subprocess CLI 호출로 충분                                                                                                                                                                              |
| Dispatcher     | 별도 TS 데몬 프로세스                  | Claude Code 코드 자리는 MCP뿐. 상태 규칙은 문서 + assert 게이트로                                                                                                                                                      |
| 자동화         | hook                                   | 사용자 결정 (불필요)                                                                                                                                                                                                   |
| 스킬 분할      | 기법별 19개 노출 스킬                  | "스킬=노출 인터페이스" → 노출 6 + lazy `methods/`                                                                                                                                                                      |
