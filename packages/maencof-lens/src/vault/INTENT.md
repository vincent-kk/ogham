## Purpose

다중 볼트 라우팅 및 그래프 캐싱 모듈. 볼트 해석, 그래프 캐시, 만료 감지를 담당한다.

## Structure

- `graph-cache/` — 볼트별 KnowledgeGraph 메모리 캐시
- `stale-detector/` — 인덱스 만료 감지
- `vault-router/` — 다중 볼트 이름→설정 해석

## Boundaries

### Always do

- 그래프 로드 전 볼트 경로 존재 여부를 검증한다
- status 응답에 인덱스 만료 경고를 포함한다

### Ask first

- 캐시 전략 변경
- 새로운 볼트 해석 로직 추가

### Never do

- 순환 의존성 도입
- 볼트 파일시스템에 쓰기
