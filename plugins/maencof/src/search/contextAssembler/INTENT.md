# contextAssembler

## Purpose

검색 결과 컨텍스트 조합. 활성화 결과에서 최적 스니펫 추출 및 조합.

## Conventions

조립 결과는 참조 라인이고 본문 포함은 호출자의 책임이다. 예산 선택과 외부 스니펫 계상은 같은 추정기를 써야 한도를 같은 기준으로 해석한다.

## Boundaries

### Always do

- ActivationResult 기반 스니펫 선택
- 토큰 한도 내 컨텍스트 구성

### Ask first

- 스니펫 추출 전략 변경

### Never do

- 그래프 데이터 수정
