# queryEngine

## Purpose

지식 그래프 쿼리 엔진. 시드 노드 해석(쿼리 내 상대 IDF 로 흔한 토큰 시드 강등 — 동형이의어 노이즈 억제, 후보 union 불변), 시드별 어휘 매칭 계수 보고(`seedCounts` — 0 = 미해석, `QueryResult` 로 항상 전파·캐시 동반), compound(kebab/snake — 공백 없이 `-`/`_` 로 결합된 다토큰) 시드의 원형 우선 조회(원형 완전 일치가 실존할 때만 채택) — 분해 AND 는 유지되고 AND 공집합일 때만 OR 저득점 폴백(`compound-or`, 스윕 오버라이드 `QgaTuning.compoundOrScore`), kg_context 자연어 분해(`deriveContextSeeds` — 단어 OR + 인접 2-gram phrase), QGA-SA 확산 실행 (maxHops → 반복 횟수 T 매핑, 쿼리 토큰 게이트 공급), 공유 since/until updated 윈도우 필터(node.updated YYYY-MM-DD 문자열 비교·양끝 inclusive, 결과 절단 전 query() 내부 1회 적용 — kg_search/kg_context/kg_timeline 공용), `subLayerFilter` 서브레이어 pre-filter(layerFilter 와 같은 위치 — collapse·절단 전), 클러스터 collapse(같은 `clusterKey` 결과를 대표 1건으로 접기 — 점수는 활성 멤버 max 승계, 대표는 활성 필터를 만족하는 그래프 전역 멤버 중 updated 최신, 접힌 수는 `collapsedCount`; query() 내부에서 절단 직전 1회).

## Boundaries

### Always do

- spreadingActivation 엔진 재사용
- queryCache로 결과 캐싱
- invalidateQueryCache 외부 제공

### Ask first

- 쿼리 파라미터 구조 변경

### Never do

- 그래프 빌드 로직 포함
- 소비자 측에서 클러스터 collapse 를 재구현 — collapse 는 query() 안 한 지점(절단 전)에서만 일어나고 kg_search·kg_context·평가 하네스가 모두 그 지점을 지난다
- `subLayerFilter` 를 절단(slice) 뒤에 적용 — post-slice 필터는 `maxResults` 미달을 만든다
