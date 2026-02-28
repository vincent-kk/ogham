---
created: 2026-02-28
updated: 2026-02-28
tags: [metadata, strategy, phases, coffaen-cache, synchronization]
layer: design-area-2
---

# 메타데이터 전략 — 3단계, .coffaen/ 구조, 동기화

## 개요

메타데이터는 검색 엔진의 핵심 자산이다. 원본에서 사전 추출한 메타데이터로
AI 에이전트가 전체 저장소를 읽지 않고 관련 문서를 찾을 수 있게 한다.

관련 문서: [Frontmatter 스키마](./05-frontmatter-schema.md) | [보조 모듈](./09-auxiliary-modules.md) | [설계 결정](./25-design-decisions.md)

---

## 1. 3단계 메타데이터

### Phase 1: 구조 메타데이터
순수 파싱만으로 추출. 외부 의존성 없음.
- 디렉토리 트리, Frontmatter, 링크 그래프, 기본 통계
- 비용: 1,000 문서 기준 <5초, ~300KB

### Phase 2: 의미 메타데이터
그래프 알고리즘 추출. LLM 없이 가능.
- Wu-Palmer, SCS, PageRank, DAG, 규칙 기반 키워드
- 비용: ~30초, ~2MB

### Phase 3: 전체 지식 그래프
LLM + 임베딩 의존. 선택적 확장.
- 트리플 추출, 벡터 임베딩, 커뮤니티 탐지
- 비용: ~5분(API 대기), ~30MB

---

## 2. 비교 요약

| 항목 | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| 외부 의존성 | 없음 | 없음 | LLM, 임베딩 |
| 오프라인 동작 | 가능 | 가능 | 불가 |
| 검색 정밀도 | 기본 | 높음 | 매우 높음 |
| 증분 갱신 비용 | 극히 낮음 | 낮음 | 높음 |

**권장 경로**: v0.1 = Phase 1 + Phase 2 일부(DAG, SA), v0.2 = Phase 2 전체, v1.0+ = Phase 3 선택적

---

## 3. `.coffaen/` 캐시 구조

```
.coffaen/
  index.json          # 그래프 구조
  weights.json        # 사전 계산 가중치
  snapshot.json       # 파일 스냅샷
  communities.json    # 커뮤니티 (Phase 2+)
  stale-nodes.json    # 무효화된 노드 (Hook 추가)
```

JSON 선택 근거: 외부 의존성 제로, 디버깅 가능, 수천 문서 규모 충분.

---

## 4. 동기화 전략

**리스크**: 메타데이터와 원본 불일치 시 검색 품질 저하.

| 전략 | 내용 |
|------|------|
| 쿼리 시점 검증 | SA 결과의 파일 존재 여부 확인 |
| 신선도 표시 | "마지막 빌드: N분 전" 반환 |
| Hook 무효화 | 파일 변경 시 `stale-nodes.json`에 추가 |
| 재빌드 임계값 | stale 10% 초과 시 전체 재빌드 권장 |
