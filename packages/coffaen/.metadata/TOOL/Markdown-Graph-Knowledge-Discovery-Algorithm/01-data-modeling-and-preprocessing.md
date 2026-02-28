## **데이터 모델링 및 전처리 구조의 설계 원칙**

지식 그래프를 구축하는 첫 번째 단계는 도메인의 요구 사항에 부합하는 데이터 모델을 정의하는 것이다. 마크다운 기반의 저장소에서 지식 그래프는 노드(문서 또는 블록), 노드 간의 관계(링크 또는 계층 구조), 그리고 이를 조직하는 원칙(Organizing Principle)의 세 가지 핵심 요소로 구성된다.3

### **문서 중심 모델과 블록 중심 모델의 비교 분석**

마크다운 문서를 그래프 노드로 변환할 때, 가장 먼저 결정해야 할 사항은 정보의 입도(Granularity)이다. 이는 시스템의 탐색 속도와 관계 탐지의 정밀도에 직접적인 영향을 미친다.1

| 구분 | 페이지 중심 모델 (Page-centric) | 블록 중심 모델 (Block-centric) |
| :---- | :---- | :---- |
| 주요 노드 단위 | 마크다운 파일 전체 (.md) | 문단, 리스트 아이템, 헤더 단위 |
| 계층 구조 반영 | 디렉토리 경로 및 파일 이름 | 부모-자식 블록 간의 중첩 관계 |
| 그래프 복잡도 | 상대적으로 낮음 (노드 수 적음) | 매우 높음 (노드 수 폭증) |
| 검색 정밀도 | 문서 수준의 맥락 제공 | 특정 아이디어 단위의 정밀 검색 |
| 성능 최적화 | 대규모 저장소에 유리 1 | 복잡한 관계 추론에 유리 5 |

옵시디언(Obsidian)과 같은 도구는 페이지 중심 모델을 채택하여 전통적인 문서 구조를 유지하면서도 빠른 그래프 렌더링을 지원한다.1 반면 로그시크(Logseq)와 같은 도구는 모든 항목을 블록으로 처리하여 부모 블록의 속성이 자식 블록으로 상속되는 강력한 계층적 관계를 구축한다.2 지식 그래프 전처리 단계에서는 이러한 입도를 사전에 정의하고, 디렉토리 계층을 노드의 속성 또는 특수한 계층적 엣지(Edge)로 모델링해야 한다.3

### **계층적 아그리게이션과 다수준 표현학습**

디렉토리 기반의 계층 구조는 그 자체로 강력한 의미적 분류 체계를 제공한다. 전처리 과정에서 이를 단순히 경로 데이터로 취급하는 대신, 계층적 지식 그래프 아그리게이션(Hierarchical Knowledge Graph Aggregation) 기법을 적용할 수 있다.7 이 패러다임은 데이터를 다수준의 의미 구조로 분할하여 효율적인 메시지 전달과 추론을 가능하게 한다.7

전처리 구조에서는 다음과 같은 아그리게이션 방식을 고려할 수 있다:

1. **스키마 기반 아그리게이션:** 디렉토리 이름, 파일 태그, 상위 폴더와의 포함 관계를 명시적인 계층적 엣지로 정의하여 레이어를 형성한다.7
2. **데이터 기반 유도:** 클러스터링이나 경로 분석을 통해 문서 간의 기능적 계층을 발견하고, 이를 기반으로 '단축 엣지(Shortcut edges)'를 생성하여 다중 홉(Multi-hop) 의존성을 단일 홉으로 변환한다.7 이는 이후 정보 검색 단계에서 탐색 속도를 비약적으로 향상시킨다.7

#### 참고 자료

1. Obsidian vs Logseq: Choosing a Note-Taking App \- OpenReplay Blog, 2월 28, 2026에 액세스, [https://blog.openreplay.com/obsidian-vs-logseq-note-taking-app/](https://blog.openreplay.com/obsidian-vs-logseq-note-taking-app/)
2. Choosing between Logseq and Obsidian | by Mark McElroy \- Medium, 2월 28, 2026에 액세스, [https://medium.com/@markmcelroydotcom/choosing-between-logseq-and-obsidian-1fe22c61f742](https://medium.com/@markmcelroydotcom/choosing-between-logseq-and-obsidian-1fe22c61f742)
3. How to Build a Knowledge Graph in 7 Steps \- Graph Database & Analytics \- Neo4j, 2월 28, 2026에 액세스, [https://neo4j.com/blog/graph-database/how-to-build-a-knowledge-graph-in-7-steps/](https://neo4j.com/blog/graph-database/how-to-build-a-knowledge-graph-in-7-steps/)
5. Obsidian vs Logseq: Which is the Better PKM Tool? : r/PKMS \- Reddit, 2월 28, 2026에 액세스, [https://www.reddit.com/r/PKMS/comments/1g86der/obsidian\_vs\_logseq\_which\_is\_the\_better\_pkm\_tool/](https://www.reddit.com/r/PKMS/comments/1g86der/obsidian_vs_logseq_which_is_the_better_pkm_tool/)
7. Hierarchical Knowledge Graph Aggregation \- Emergent Mind, 2월 28, 2026에 액세스, [https://www.emergentmind.com/topics/hierarchical-knowledge-graph-aggregation](https://www.emergentmind.com/topics/hierarchical-knowledge-graph-aggregation)
