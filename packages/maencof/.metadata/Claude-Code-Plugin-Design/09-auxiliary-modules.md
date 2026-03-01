---
created: 2026-02-28
updated: 2026-02-28
tags: [auxiliary-modules, query-engine, context-assembler, metadata-store, incremental-tracker]
layer: design-area-2
---

# 보조 모듈 — QueryEngine, ContextAssembler, MetadataStore, IncrementalTracker

## 개요

코어 알고리즘(core/) 위에 위치하는 보조 구성요소. 오케스트레이션, 토큰 최적화 출력,
영속화, 증분 갱신을 담당한다.

관련 문서: [코어 모듈](./08-core-modules.md) | [데이터 파이프라인](./11-data-pipeline.md) | [메타데이터 전략](./12-metadata-strategy.md)

---

## 1. Query Engine (`search/`)

- **책임**: 쿼리 파싱, 시드 노드 선정, 확산 활성화 오케스트레이션, 결과 랭킹
- **계층**: 핵심 알고리즘(core/) 위의 오케스트레이션 계층
- **입력**: 사용자 쿼리 (키워드 또는 파일 경로)
- **출력**: 랭킹된 관련 노드 목록 + 활성화 점수

**시드 노드 결정**:
- 파일 경로 직접 지정 → 해당 노드가 시드
- 키워드 지정 → Frontmatter 태그/제목 매칭 노드들이 시드

---

## 2. Context Assembler (`search/`)

- **책임**: 검색 결과를 토큰 최적화 컨텍스트 블록으로 조립
- **핵심 가치**: AI 에이전트에게 최소 토큰으로 최대 맥락 전달
- **출력 형태**: 문서 경로 + Frontmatter 요약 + 관계 설명 + 활성화 점수
- **토큰 예산**: 초과 시 낮은 순위부터 제거

---

## 3. Metadata Store (`index/`)

- **책임**: 사전 계산된 메타데이터 영속화 (직렬화/역직렬화)
- **저장 위치**: `.maencof/` 디렉토리 하위
- **형식**: JSON (디버깅 용이성, 외부 의존성 제로)
- **파일 구조**:

| 파일 | 내용 |
|------|------|
| `index.json` | 그래프 구조 (노드, 엣지, 인접 리스트) |
| `weights.json` | 사전 계산 가중치 (엣지별, 노드별) |
| `snapshot.json` | 마지막 빌드 파일 스냅샷 (mtime, 해시) |
| `communities.json` | 커뮤니티 탐지 결과 (Phase 2+) |

---

## 4. Incremental Tracker (`index/`)

- **책임**: 파일 mtime 기반 변경 감지, 부분 재인덱싱 범위 계산
- **전략**: 변경 파일의 1-hop 이웃만 가중치 재계산
- **제한**: 전역 메트릭(PageRank)은 다음 전체 빌드 시 갱신
- **인덱스 신선도**: stale 노드 비율 10% 초과 시 전체 재빌드 권장

---

## 5. 계층 구조 요약

```
search/ (오케스트레이션)     index/ (영속화)
  QueryEngine                 MetadataStore
  ContextAssembler            IncrementalTracker
       |                           |
       +----------- core/ ---------+
         (순수 알고리즘, I/O 없음)
```
