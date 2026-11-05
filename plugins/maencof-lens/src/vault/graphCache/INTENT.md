## Purpose

볼트별 세션 그래프 캐시와 읽기 시점의 stale 델타 병합을 소유한다. 볼트 디스크 갱신과 재구축은 소유하지 않는다.

## Conventions

- 읽기 가용성을 최신성보다 우선한다. stale 병합은 메모리에만 적용하고 실패해도 사용할 수 있는 그래프를 돌려준다.
- query-cache 무효화는 maencof 병합 함수에 맡긴다. 이 캐시가 직접 조작하면 본가의 무효화 계약과 갈라진다.

## Dependencies

- maencof의 stale 병합 함수가 query-cache 무효화도 소유한다. 렌즈에서 무효화를 중복 구현하지 않는다.

## Boundaries

### Always do

- 이 모듈의 단일 책임 (per-vault 캐시 + read-time stale merge) 을 유지한다
- stale merge 는 in-memory only — vault 디스크에 절대 쓰지 않는다
- merge / load 실패 시 read availability 우선: 가능한 graph 를 그대로 반환하고 예외를 흡수한다
- 변경 시 그래프 캐시 검증을 함께 업데이트한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈 (특히 @ogham/maencof internal export) 에 대한 새로운 의존성 추가
- stale 파일의 mtime 캐싱 정책 변경

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
- background rebuild 트리거 (lens 는 read-only)
- query-cache 직접 조작 — 무효화는 maencof 측 mergeStaleNodesIntoGraph 의 책임이다
