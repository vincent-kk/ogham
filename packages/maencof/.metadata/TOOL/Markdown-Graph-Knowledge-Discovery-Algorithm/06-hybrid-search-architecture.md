## **하이브리드 탐색 아키텍처: 벡터 검색과 그래프 탐색의 결합**

최근 지식 그래프 검색의 트렌드는 벡터 데이터베이스의 의미적 유사성 검색과 그래프 데이터베이스의 구조적 추론 능력을 결합한 '하이브리드 RAG(HybridRAG)'이다.30 이는 마크다운 전처리 시스템이 지향해야 할 최종적인 구조적 목표이기도 하다.

### **구조적 근접성과 의미적 유사성의 조화**

사용자의 모호한 질문에 대해 먼저 벡터 검색을 수행하여 의미적으로 유사한 초기 노드 세트(Seed nodes)를 찾는다.31 그 다음, 이 초기 노드들을 소스로 삼아 확산 활성화 탐색을 수행함으로써, 질문에는 직접 언급되지 않았지만 구조적으로 긴밀하게 연결된 문서를 찾아낸다.31 이러한 방식은 벡터 검색의 한계인 '관계 이해 부족'과 그래프 검색의 한계인 '키워드 매칭의 경직성'을 동시에 극복한다.31

### **커뮤니티 탐지를 통한 전역적 맥락 파악**

전처리 단계에서 라이덴(Leiden)이나 루뱅(Louvain) 알고리즘을 사용하여 그래프 내의 조밀한 커뮤니티를 식별하고, 각 커뮤니티에 대한 요약을 미리 생성해 두는 기법도 매우 효과적이다.10 이는 사용자가 특정 문서가 아닌 "이 폴더 전체의 핵심 내용이 뭐야?" 혹은 "내 지식 저장소에서 최근 가장 많이 다뤄진 주제는?"과 같은 전역적 질문(Global query)을 던졌을 때, 수천 개의 문서를 일일이 뒤지는 대신 요약된 커뮤니티 노드들만을 탐색하여 빠르게 답을 내놓을 수 있게 한다.10

#### 참고 자료

10. Welcome \- GraphRAG, 2월 28, 2026에 액세스, [https://microsoft.github.io/graphrag/](https://microsoft.github.io/graphrag/)
30. HybridRAG: Merging Structured and Unstructured Data for Cutting-Edge Information Extraction | ADaSci Blog, 2월 28, 2026에 액세스, [https://adasci.org/blog/hybridrag-merging-structured-and-unstructured-data-for-cutting-edge-information-extraction](https://adasci.org/blog/hybridrag-merging-structured-and-unstructured-data-for-cutting-edge-information-extraction)
31. HybridRAG and Why Combine Vector Embeddings with Knowledge Graphs for RAG?, 2월 28, 2026에 액세스, [https://memgraph.com/blog/why-hybridrag](https://memgraph.com/blog/why-hybridrag)
32. Global Community Summary Retriever \- GraphRAG, 2월 28, 2026에 액세스, [https://graphrag.com/reference/graphrag/global-community-summary-retriever/](https://graphrag.com/reference/graphrag/global-community-summary-retriever/)
33. Hybrid Retrieval-Augmented Generation: Semantic and Structural Integration for Large Language Model Reasoning \- MDPI, 2월 28, 2026에 액세스, [https://www.mdpi.com/2076-3417/16/5/2244](https://www.mdpi.com/2076-3417/16/5/2244)
34. From Local to Global: A GraphRAG Approach to Query-Focused Summarization \- arXiv, 2월 28, 2026에 액세스, [https://arxiv.org/html/2404.16130v2](https://arxiv.org/html/2404.16130v2)
