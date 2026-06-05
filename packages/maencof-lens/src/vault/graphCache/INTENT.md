## Purpose

볼트별 KnowledgeGraph 메모리 캐시. 세션 범위, 최초 접근 시 지연 로드. 매 호출에서 maencof 의 stale-nodes.json 델타를 in-memory 로 머지하여 search/context/navigate 가 post-mutation 그래프를 보도록 보장한다.

## Boundaries

### Always do

- 이 모듈의 단일 책임 (per-vault 캐시 + read-time stale merge) 을 유지한다
- stale merge 는 in-memory only — vault 디스크에 절대 쓰지 않는다
- merge / load 실패 시 read availability 우선: 가능한 graph 를 그대로 반환하고 예외를 흡수한다
- 변경 시 graphCache.test.ts 를 함께 업데이트한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈 (특히 @ogham/maencof internal export) 에 대한 새로운 의존성 추가
- stale 파일의 mtime 캐싱 정책 변경

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
- background rebuild 트리거 (lens 는 read-only)
- query-cache 직접 조작 — 무효화는 maencof 측 mergeStaleNodesIntoGraph 의 책임이다

## Dependencies

- @ogham/maencof: MetadataStore, mergeStaleNodesIntoGraph, READ_REINDEX_CAP, KnowledgeGraph 타입
