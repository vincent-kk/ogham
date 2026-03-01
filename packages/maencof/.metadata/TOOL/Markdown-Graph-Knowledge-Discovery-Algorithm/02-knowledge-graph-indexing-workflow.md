## **효율적인 지식 그래프 전처리 및 인덱싱 워크플로우**

대규모 마크다운 저장소에서 관계 탐지를 가속화하기 위해서는 원본 문서를 처리하여 구조화된 지식으로 변환하는 파이프라인이 정교하게 설계되어야 한다. 특히 증분 처리(Incremental processing)는 시스템의 확장성을 결정짓는 핵심 요소이다.9

### **증분 데이터 수집 및 변화 탐지**

문서가 수정될 때마다 전체 저장소를 재인덱싱하는 것은 비효율적이다. 코코인덱스(CocoIndex)와 같은 프레임워크는 파일의 마지막 수정 시간을 추적하여 변경된 파일만을 대상으로 다운스트림 처리를 수행한다.9 예를 들어 기업 내 문서의 일일 변경율이 1%라면, 증분 처리 방식을 통해 계산 리소스의 99%를 절약할 수 있으며, 이는 LLM API 호출 비용과 그래프 데이터베이스 부하를 최소화한다.9

### **계층적 청킹(Hierarchical Chunking)과 의미론적 추출**

마크다운 파일은 구조적 메타데이터를 보존하면서도 텍스트 유닛(TextUnits)으로 세분화되어야 한다.10 전처리 과정에서 적용되는 계층적 청킹 기술은 문서의 헤더(\#, \#\#, \#\#\#)를 기준으로 분할하여 담화 경계(Discourse boundaries)를 존중한다.11 만약 특정 섹션이 너무 길 경우(예: 2048자 초과), 200자 정도의 중첩(Overlap)을 허용하는 재귀적 캐릭터 분할을 적용하여 문맥이 끊기는 것을 방지한다.11

이후 추출 단계에서는 LLM을 사용하여 각 청크에서 엔티티, 관계, 핵심 주장(Claims)을 추출한다.10 추출된 정보는 (주체, 서술어, 객체) 형태의 트리플로 정규화되어 그래프 데이터베이스에 저장된다.12 이때 디렉토리 구조에서 기인한 계층적 관계는 PART\_OF 또는 CONTAINED\_IN과 같은 메타 관계(Meta-relation)로 명시되어 그래프 구조의 뼈대를 형성한다.3

#### 참고 자료

3. How to Build a Knowledge Graph in 7 Steps \- Graph Database & Analytics \- Neo4j, 2월 28, 2026에 액세스, [https://neo4j.com/blog/graph-database/how-to-build-a-knowledge-graph-in-7-steps/](https://neo4j.com/blog/graph-database/how-to-build-a-knowledge-graph-in-7-steps/)
9. Building a Knowledge Graph from Meeting Notes that automatically updates \- CocoIndex, 2월 28, 2026에 액세스, [https://cocoindex.io/blogs/meeting-notes-graph](https://cocoindex.io/blogs/meeting-notes-graph)
10. Welcome \- GraphRAG, 2월 28, 2026에 액세스, [https://microsoft.github.io/graphrag/](https://microsoft.github.io/graphrag/)
11. Towards Practical GraphRAG: Efficient Knowledge Graph Construction and Hybrid Retrieval at Scale \- arXiv, 2월 28, 2026에 액세스, [https://arxiv.org/html/2507.03226v3](https://arxiv.org/html/2507.03226v3)
12. HuixiangDou2: A Robustly Optimized GraphRAG Approach \- arXiv, 2월 28, 2026에 액세스, [https://arxiv.org/html/2503.06474v1](https://arxiv.org/html/2503.06474v1)
