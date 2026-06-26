# @ogham/r-statistics

Claude 를 도메인 중립 **통계 전문가** 로 만드는 플러그인 — 가설검정, R 코드 생성,
헤드리스 `Rscript` 기반 재현 가능한 분석. 유일한 도메인은 통계 방법론 그 자체이며,
어떤 응용 도메인(의료·물리·사회과학…)에도 앵커링하지 않습니다.

## 무엇을 하나

데이터셋과 가설이 주어지면 다음 파이프라인을 진행합니다:

1. 요청을 **분류**하고 **기법을 선택**합니다 (통계학자 에이전트의 결정트리:
   결과변수 타입 × 설계 구조 × 가정).
2. **가정을 검정**하고, 부적합한 기법을 분석 실행 전에 차단하는 **결정적 통계
   게이트**를 통과시킵니다.
3. 격리된 워크스페이스에서 헤드리스 `Rscript` 로 **R 을 실행**하고, 그래프·표·모델을
   해시 검증된 아티팩트로 수집합니다.
4. 결과를 **검증**(가정 처리·다중비교·효과크기)하고 **보고**합니다 — 필요 시
   Quarto 로 DOCX/HTML/PDF 렌더링.

비결정 추론 레이어(에이전트)를 결정적 상태머신(Dispatcher)과 결정적 실행(MCP 도구)이
위아래로 감싸므로, 분석은 재현 가능하고 게이트는 엄정하게 유지됩니다.

## 동작 방식

로컬 MCP 서버(`tools`)가 실행 도구 4종을 노출합니다 — `run-r`, `get-r-job`,
`cancel-r-job`, `assert-analysis-plan`. `analyze` 스킬이 Dispatcher 이고,
`statistician`·`r-expert`·`methodology-validator` 가 추론 에이전트입니다. R 은
명령 게이트(프로세스 생성·파일시스템 탈출·동적 설치·네트워크 차단) 뒤에서
사전구축 패키지 화이트리스트로 `--vanilla` temp 워크스페이스에서 실행됩니다.

## 사용법

```
# 데이터 + 가설로 전체 분석 (interactive)
/r-statistics:analyze --data results.csv --question "처치가 결과를 바꾸는가?"

# 무인 엄격 파이프라인
/r-statistics:analyze --auto --data results.csv

# 단일 단계
/r-statistics:data-preparation   /r-statistics:assumption-check
/r-statistics:visualization      /r-statistics:reporting

# R 확인 / 설치
/r-statistics:r-setup
```

## 요구사항

- Node.js ≥ 20.
- 로컬 R 설치(`Rscript`). `/r-statistics:r-setup` 으로 탐지·설치하며, 비표준 경로면
  `R_STATISTICS_RSCRIPT` 를 설정하세요.

## 문서

설계 명세는 [`.metadata/r-statistics/`](../../.metadata/r-statistics/) 에 있습니다.
