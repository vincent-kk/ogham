# metadataStore

## Purpose

사전 계산된 그래프/가중치 메타데이터 JSON 영속화 및 역직렬화.

## Structure

- `index.ts` — 순수 barrel (공개 API: MetadataStore/serializeGraph/deserializeGraph/deserializeShards/atomicWriteJson/withVaultLock/CACHE_FILES + 타입)
- `types/` organ — 공개 타입 (SnapshotEntry/FileSnapshot/WeightsData/StaleEntry/StaleEntries)
- `operations/` organ — 직렬화(serializeGraph/deserializeGraph/deserializeShards) + MetadataStore 클래스(.maencof/ R/W) + I/O 프리미티브(atomicWriteJson/withVaultLock), 함수 1개/파일

## Boundaries

### Always do

- CACHE_FILES 상수로 파일명 관리
- Map ↔ JSON 직렬화 처리

### Ask first

- 캐시 파일 구조 변경

### Never do

- 캐시 외 데이터 저장
