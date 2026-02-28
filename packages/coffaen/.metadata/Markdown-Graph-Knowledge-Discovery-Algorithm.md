# **계층적 마크다운 문서 저장소의 지식 그래프 전환과 구조적 최적화 및 확산적 정보 검색에 관한 연구 보고서**

현대적인 지식 관리와 엔터프라이즈 문서 시스템은 단순히 정보를 저장하는 단계를 넘어, 산재된 데이터 간의 유기적인 관계를 탐지하고 이를 통해 새로운 통찰을 도출하는 지능형 시스템으로 진화하고 있다. 특히 마크다운(Markdown) 형식은 비정형 텍스트의 유연성과 위키링크(Wikilinks)를 통한 정형적 연결성을 동시에 제공함으로써 개인 지식 관리(PKM)부터 대규모 기업용 위키에 이르기까지 핵심적인 매체로 자리 잡았다.1 그러나 디렉토리 구조로 표현되는 파일 시스템의 물리적 계층과 문서 내 링크로 형성되는 논리적 그래프 구조가 결합될 때, 데이터의 복잡성은 기하급수적으로 증가하며 이를 효율적으로 탐색하기 위한 고도의 전처리 기법과 알고리즘적 접근이 필수적으로 요구된다.3

본 보고서는 디렉토리 계층과 마크다운 문서 간의 그래프 링크를 전처리하여 문서 간 관계를 신속하게 탐지하고, 확산적 정보 검색(Divergent Information Retrieval)을 유도하기 위한 논리적 기반을 구축하는 데 목적이 있다. 이를 위해 데이터 모델링의 원칙부터 계층적 아그리게이션, 순환 그래프의 제거를 위한 피드백 아크 세트(Feedback Arc Set) 이론, 그리고 인지 심리학에 기반한 확산 활성화(Spreading Activation) 알고리즘에 이르기까지 전 과정을 심도 있게 분석한다.

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

## **효율적인 지식 그래프 전처리 및 인덱싱 워크플로우**

대규모 마크다운 저장소에서 관계 탐지를 가속화하기 위해서는 원본 문서를 처리하여 구조화된 지식으로 변환하는 파이프라인이 정교하게 설계되어야 한다. 특히 증분 처리(Incremental processing)는 시스템의 확장성을 결정짓는 핵심 요소이다.9

### **증분 데이터 수집 및 변화 탐지**

문서가 수정될 때마다 전체 저장소를 재인덱싱하는 것은 비효율적이다. 코코인덱스(CocoIndex)와 같은 프레임워크는 파일의 마지막 수정 시간을 추적하여 변경된 파일만을 대상으로 다운스트림 처리를 수행한다.9 예를 들어 기업 내 문서의 일일 변경율이 1%라면, 증분 처리 방식을 통해 계산 리소스의 99%를 절약할 수 있으며, 이는 LLM API 호출 비용과 그래프 데이터베이스 부하를 최소화한다.9

### **계층적 청킹(Hierarchical Chunking)과 의미론적 추출**

마크다운 파일은 구조적 메타데이터를 보존하면서도 텍스트 유닛(TextUnits)으로 세분화되어야 한다.10 전처리 과정에서 적용되는 계층적 청킹 기술은 문서의 헤더(\#, \#\#, \#\#\#)를 기준으로 분할하여 담화 경계(Discourse boundaries)를 존중한다.11 만약 특정 섹션이 너무 길 경우(예: 2048자 초과), 200자 정도의 중첩(Overlap)을 허용하는 재귀적 캐릭터 분할을 적용하여 문맥이 끊기는 것을 방지한다.11

이후 추출 단계에서는 LLM을 사용하여 각 청크에서 엔티티, 관계, 핵심 주장(Claims)을 추출한다.10 추출된 정보는 (주체, 서술어, 객체) 형태의 트리플로 정규화되어 그래프 데이터베이스에 저장된다.12 이때 디렉토리 구조에서 기인한 계층적 관계는 PART\_OF 또는 CONTAINED\_IN과 같은 메타 관계(Meta-relation)로 명시되어 그래프 구조의 뼈대를 형성한다.3

## **순환 그래프의 탐지와 논리적 DAG 변환 알고리즘**

마크다운 문서 간의 링크는 본질적으로 방향성을 가지며, 사용자의 작성 습관에 따라 상호 참조나 순환 고리가 발생하기 쉽다. 하지만 계층적 추론이나 위계적 정보 확산을 위해서는 그래프를 방향성 비순환 그래프(DAG, Directed Acyclic Graph)로 변환하거나 최소한 순환의 구조를 명확히 제어할 수 있어야 한다.13

### **깊이 우선 탐색(DFS) 기반의 순환 탐지**

그래프 탐색의 기본이 되는 DFS는 순환을 탐지하는 가장 고전적이면서도 효율적인 알고리즘이다.15 탐색 과정에서 각 정점은 세 가지 상태(방문하지 않음, 스택에 있음, 방문 완료)를 거치게 된다. 탐색 중 현재 경로상에 있는 정점(즉, 스택에 있는 정점)으로 다시 연결되는 엣지를 발견하면 이를 '역방향 엣지(Back edge)'라고 정의하며, 이것이 바로 순환의 직접적인 증거가 된다.16

순환을 끊어내기 위한 논리적 단계는 다음과 같다:

1. **엣지 분류:** DFS 트리 생성 과정에서 엣지를 트리 엣지, 순방향 엣지, 역방향 엣지, 교차 엣지로 분류한다.16  
2. **역방향 엣지의 제거 또는 반전:** 순환을 형성하는 유일한 요소인 역방향 엣지를 제거하거나, 그 방향을 반전시킴으로써 그래프를 DAG로 변환한다.13

### **피드백 아크 세트(Feedback Arc Set, FAS) 문제와 최적화**

그래프에서 최소한의 엣지만을 제거하여 DAG를 만드는 문제를 최소 피드백 아크 세트(Minimum FAS) 문제라고 한다.13 이는 NP-하드(NP-hard) 문제로 알려져 있어, 대규모 마크다운 저장소에서는 휴리스틱 알고리즘이 주로 사용된다.14

가장 널리 쓰이는 기법 중 하나는 선형 배치(Linear Arrangement) 방식이다. 정점들을 특정한 순서(예: 폴더 구조의 깊이 우선 순서 또는 문서 생성 시간 순서)로 일렬로 배치한 뒤, 이 순서를 거스르는 모든 엣지를 역방향 엣지로 간주하여 제거하는 것이다.13 특히 smartAE 알고리즘은 제거된 엣지 중 다시 추가해도 순환을 만들지 않는 엣지들을 스마트하게 재삽입하여 정보 손실을 최소화한다.18

| 알고리즘 | 복잡도 | 특징 |
| :---- | :---- | :---- |
| 표준 DFS 순환 탐지 | ![][image1] | 구현이 간단하며 역방향 엣지 식별에 용이 15 |
| Kahn 알고리즘 | ![][image1] | 위상 정렬 기반, 순환 존재 여부 즉시 판별 15 |
| smartAE 휴리스틱 | ![][image2] | 최소한의 정보 손실로 DAG 변환 18 |
| Rocha-Thatte (분산형) | ![][image3] | 대규모 분산 그래프에서 모든 단순 순환 탐지 21 |

15

이러한 전처리 과정을 통해 마크다운 저장소는 논리적 위계가 보장된 구조로 정제되며, 이는 후속 탐색 알고리즘의 안정성을 담보하는 기반이 된다.

## **확산적 정보 검색을 위한 탐색 알고리즘: 확산 활성화 모델**

전처리가 완료된 지식 그래프에서 사용자에게 관련성 높은 정보를 제안하거나, 질문에 대한 답을 찾기 위해 멀티 홉(Multi-hop) 추론을 수행할 때 가장 효과적인 기법은 인지 심리학에서 영감을 얻은 확산 활성화(Spreading Activation, SA) 알고리즘이다.22

### **확산 활성화의 수학적 모델링 및 메커니즘**

확산 활성화는 연상 네트워크에서 하나의 개념이 활성화되면 그 에너지(활성화 값)가 연결된 링크를 타고 주변 노드로 퍼져 나가는 과정을 시뮬레이션한다.22 이는 사용자가 특정 노드를 조회할 때 그와 관련된 잠재적 아이디어를 '확산적으로' 검색하는 데 탁월한 성능을 발휘한다.23

알고리즘의 핵심 수식은 다음과 같이 정의된다:

![][image4]  
여기서 $A\[j\]$는 타겟 노드의 활성화 값, $A\[i\]$는 소스 노드의 활성화 값, $W\[i,j\]$는 두 노드 사이의 엣지 가중치, 그리고 ![][image5]는 감쇠 인자(Decay Factor)이다.23

활성화 폭발을 방지하고 의미 있는 정보만을 필터링하기 위해 다음과 같은 제어 로직이 적용된다:

1. **발화 임계값(Firing Threshold, ![][image6]):** 노드의 활성화 값이 일정 수준 ![][image6]를 넘어야만 주변 노드로 에너지를 전달할 수 있다.23  
2. **감쇠 인자(![][image5]):** 홉(Hop)을 거듭할수록 에너지가 손실되도록 하여, 멀리 떨어진 노드의 영향력을 제한한다.23  
3. **최대 활성화 제한:** 개별 노드의 활성화 값은 보통 1.0(100%)으로 캡핑(Capping)되어 무한 증폭을 막는다.23

### **확산 활성화와 재시작 랜덤 워크(RWR)의 비교**

정보 검색 분야에서 확산 활성화는 종종 재시작 랜덤 워크(Random Walk with Restart)와 비교된다.25 RWR은 마르코프 연쇄 모델을 기반으로 하며 페이지랭크(PageRank)와 수학적으로 유사한 정적 분포를 계산하는 데 강점이 있다.25

반면, 확산 활성화는 '쿼리 종속적(Query dependent)' 특성이 강하며, 검색 환경의 가변성에 따라 가중치를 미세 조정할 수 있는 유연성이 훨씬 크다.25 마크다운 지식 관리 시스템에서는 사용자의 현재 문맥(현재 읽고 있는 파일)이 활성화의 소스가 되므로, 동적인 확산 활성화 모델이 확산적 검색에 더 적합한 논리적 기반을 제공한다.23

## **의미론적 가중치 설계 및 거리 측정 기법**

그래프 탐색의 품질은 엣지의 가중치를 어떻게 설정하느냐에 달려 있다. 마크다운 저장소에서는 디렉토리 계층상의 거리와 문서 내 링크의 강도를 결합한 복합적인 가중치 전략이 필요하다.27

### **계층적 유사도와 거리 측정**

디렉토리 구조상에서 두 문서가 얼마나 가까운지를 측정하기 위해 우-팔머(Wu-Palmer) 유사도 측도를 사용할 수 있다.29 이는 두 노드가 공유하는 최하위 공통 조상(Lowest Common Subsumer, LCS)의 깊이를 기준으로 유사도를 산출한다.29

![][image7]  
이 공식에 따르면, 같은 하위 폴더에 있는 문서들은 더 깊은 계층에서 공통 조상을 가지므로 높은 유사도 점수를 얻게 된다.29 이는 디렉토리 계층이 단순한 파일 정리를 넘어 의미적 군집을 형성하고 있다는 전제를 논리적으로 뒷받침한다.

### **의미론적 연결 점수(Semantic Connectivity Score, SCS)**

문서 간의 위키링크에 대해서는 단순한 연결 유무를 넘어, 두 개념 사이에 존재하는 경로의 수와 길이를 고려한 SCS를 적용할 수 있다.27 SCS는 노드 쌍 사이의 잠재적 연결을 측정하며, 경로가 짧고 많을수록 높은 점수를 부여한다.28 이 가중치는 확산 활성화 알고리즘의 ![][image8] 값으로 대입되어, 더 밀접하게 연관된 문서로 에너지가 더 잘 전달되도록 유도한다.23

| 가중치 전략 | 대상 | 수식/논리 | 기대 효과 |
| :---- | :---- | :---- | :---- |
| **개념 빈도 (CF)** | 노드(문서) | 문서 내 개념 출현 빈도 28 | 특정 주제에 대한 전문성 식별 |
| **우-팔머 유사도** | 계층 엣지 | 계층 트리 내 깊이 및 LCS 기반 29 | 폴더 구조 기반의 의미론적 거리 반영 |
| **SCS** | 링크 엣지 | 다중 경로 수 및 댐핑 인자 적용 28 | 복잡한 네트워크 내 연관 강도 측정 |
| **페이지랭크** | 노드(문서) | 인입 링크의 품질 및 수량 27 | 지식 허브(MOC) 문서 탐지 |

27

## **하이브리드 탐색 아키텍처: 벡터 검색과 그래프 탐색의 결합**

최근 지식 그래프 검색의 트렌드는 벡터 데이터베이스의 의미적 유사성 검색과 그래프 데이터베이스의 구조적 추론 능력을 결합한 '하이브리드 RAG(HybridRAG)'이다.30 이는 마크다운 전처리 시스템이 지향해야 할 최종적인 구조적 목표이기도 하다.

### **구조적 근접성과 의미적 유사성의 조화**

사용자의 모호한 질문에 대해 먼저 벡터 검색을 수행하여 의미적으로 유사한 초기 노드 세트(Seed nodes)를 찾는다.31 그 다음, 이 초기 노드들을 소스로 삼아 확산 활성화 탐색을 수행함으로써, 질문에는 직접 언급되지 않았지만 구조적으로 긴밀하게 연결된 문서를 찾아낸다.31 이러한 방식은 벡터 검색의 한계인 '관계 이해 부족'과 그래프 검색의 한계인 '키워드 매칭의 경직성'을 동시에 극복한다.31

### **커뮤니티 탐지를 통한 전역적 맥락 파악**

전처리 단계에서 라이덴(Leiden)이나 루뱅(Louvain) 알고리즘을 사용하여 그래프 내의 조밀한 커뮤니티를 식별하고, 각 커뮤니티에 대한 요약을 미리 생성해 두는 기법도 매우 효과적이다.10 이는 사용자가 특정 문서가 아닌 "이 폴더 전체의 핵심 내용이 뭐야?" 혹은 "내 지식 저장소에서 최근 가장 많이 다뤄진 주제는?"과 같은 전역적 질문(Global query)을 던졌을 때, 수천 개의 문서를 일일이 뒤지는 대신 요약된 커뮤니티 노드들만을 탐색하여 빠르게 답을 내놓을 수 있게 한다.10

## **결론 및 제언**

마크다운 기반의 계층적 지식 저장소를 지능형 그래프 시스템으로 전환하기 위한 논리적 여정은 정교한 데이터 모델링에서 시작하여 엄밀한 그래프 알고리즘으로 완성된다. 디렉토리 구조는 지식의 위계를 설정하는 뼈대가 되며, 위키링크는 지식의 신경망을 형성한다.

본 연구 보고서에서 제시한 전처리 및 탐색 알고리즘의 핵심 제언은 다음과 같다:

첫째, 전처리 구조는 물리적 디렉토리와 논리적 링크를 통합한 다수준 계층 그래프(Multilevel Hierarchical Graph)로 가져가야 하며, 증분 인덱싱을 통해 실시간성을 확보해야 한다.

둘째, 순환 그래프의 문제는 DFS 기반의 역방향 엣지 식별과 최소 피드백 아크 세트 휴리스틱을 통해 DAG로 변환함으로써 추론의 일관성을 확보해야 한다.

셋째, 정보 검색은 인지적 유연성이 뛰어난 확산 활성화 모델을 채택하되, 발화 임계값과 감쇠 인자를 통해 검색의 정밀도와 발산성 사이의 균형을 유지해야 한다.

넷째, 우-팔머 측도와 SCS를 결합한 가중치 설계를 통해 계층적 맥락과 네트워크적 맥락을 동시에 반영해야 한다.

이러한 알고리즘적 기반 위에 구축된 시스템은 단순한 문서 저장소를 넘어, 사용자의 사고를 확장하고 파편화된 정보들 사이에서 숨겨진 관계를 빠르게 탐지해내는 진정한 '두 번째 뇌(Second Brain)'로서 기능할 수 있을 것이다. 지식 그래프의 구조적 최적화는 단순히 검색 속도를 높이는 기술적 수단이 아니라, 지식의 엔트로피를 낮추고 정보의 가치를 극대화하는 지능형 시스템의 핵심 설계 철학이다.

#### **참고 자료**

1. Obsidian vs Logseq: Choosing a Note-Taking App \- OpenReplay Blog, 2월 28, 2026에 액세스, [https://blog.openreplay.com/obsidian-vs-logseq-note-taking-app/](https://blog.openreplay.com/obsidian-vs-logseq-note-taking-app/)  
2. Choosing between Logseq and Obsidian | by Mark McElroy \- Medium, 2월 28, 2026에 액세스, [https://medium.com/@markmcelroydotcom/choosing-between-logseq-and-obsidian-1fe22c61f742](https://medium.com/@markmcelroydotcom/choosing-between-logseq-and-obsidian-1fe22c61f742)  
3. How to Build a Knowledge Graph in 7 Steps \- Graph Database & Analytics \- Neo4j, 2월 28, 2026에 액세스, [https://neo4j.com/blog/graph-database/how-to-build-a-knowledge-graph-in-7-steps/](https://neo4j.com/blog/graph-database/how-to-build-a-knowledge-graph-in-7-steps/)  
4. The Hybrid Multimodal Graph Index (HMGI): A Comprehensive Framework for Integrated Relational and Vector Search \- arXiv, 2월 28, 2026에 액세스, [https://arxiv.org/html/2510.10123v1](https://arxiv.org/html/2510.10123v1)  
5. Obsidian vs Logseq: Which is the Better PKM Tool? : r/PKMS \- Reddit, 2월 28, 2026에 액세스, [https://www.reddit.com/r/PKMS/comments/1g86der/obsidian\_vs\_logseq\_which\_is\_the\_better\_pkm\_tool/](https://www.reddit.com/r/PKMS/comments/1g86der/obsidian_vs_logseq_which_is_the_better_pkm_tool/)  
6. Obsidian vs Logseq | Which Knowledge Management Tool is Better in 2025? \- YouTube, 2월 28, 2026에 액세스, [https://www.youtube.com/watch?v=lm3OAqimdPE](https://www.youtube.com/watch?v=lm3OAqimdPE)  
7. Hierarchical Knowledge Graph Aggregation \- Emergent Mind, 2월 28, 2026에 액세스, [https://www.emergentmind.com/topics/hierarchical-knowledge-graph-aggregation](https://www.emergentmind.com/topics/hierarchical-knowledge-graph-aggregation)  
8. \[1201.6566\] Fast and Exact Top-k Search for Random Walk with Restart \- arXiv.org, 2월 28, 2026에 액세스, [https://arxiv.org/abs/1201.6566](https://arxiv.org/abs/1201.6566)  
9. Building a Knowledge Graph from Meeting Notes that automatically updates \- CocoIndex, 2월 28, 2026에 액세스, [https://cocoindex.io/blogs/meeting-notes-graph](https://cocoindex.io/blogs/meeting-notes-graph)  
10. Welcome \- GraphRAG, 2월 28, 2026에 액세스, [https://microsoft.github.io/graphrag/](https://microsoft.github.io/graphrag/)  
11. Towards Practical GraphRAG: Efficient Knowledge Graph Construction and Hybrid Retrieval at Scale \- arXiv, 2월 28, 2026에 액세스, [https://arxiv.org/html/2507.03226v3](https://arxiv.org/html/2507.03226v3)  
12. HuixiangDou2: A Robustly Optimized GraphRAG Approach \- arXiv, 2월 28, 2026에 액세스, [https://arxiv.org/html/2503.06474v1](https://arxiv.org/html/2503.06474v1)  
13. Sorting Heuristics for the Feedback Arc Set Problem, 2월 28, 2026에 액세스, [https://www.fim.uni-passau.de/fileadmin/dokumente/fakultaeten/fim/forschung/mip-berichte/mip1104.pdf](https://www.fim.uni-passau.de/fileadmin/dokumente/fakultaeten/fim/forschung/mip-berichte/mip1104.pdf)  
14. Feedback arc set \- Wikipedia, 2월 28, 2026에 액세스, [https://en.wikipedia.org/wiki/Feedback\_arc\_set](https://en.wikipedia.org/wiki/Feedback_arc_set)  
15. Algorithms for Detecting Cycles in Graphs: A Comprehensive Guide \- AlgoCademy Blog, 2월 28, 2026에 액세스, [https://algocademy.com/blog/algorithms-for-detecting-cycles-in-graphs-a-comprehensive-guide/](https://algocademy.com/blog/algorithms-for-detecting-cycles-in-graphs-a-comprehensive-guide/)  
16. Detecting Cycles in a Directed Graph | Baeldung on Computer ..., 2월 28, 2026에 액세스, [https://www.baeldung.com/cs/detecting-cycles-in-directed-graph](https://www.baeldung.com/cs/detecting-cycles-in-directed-graph)  
17. AN EXACT METHOD FOR THE MINIMUM FEEDBACK ARC SET PROBLEM 1\. Introduction. A directed graph G is a pair (V,E) of finite sets, the, 2월 28, 2026에 액세스, [https://www.mat.univie.ac.at/\~herman/fwf-P27891-N32/minimum\_feedback\_arc\_set.pdf](https://www.mat.univie.ac.at/~herman/fwf-P27891-N32/minimum_feedback_arc_set.pdf)  
18. Effective Heuristics for Finding Small Minimal ... \- CEUR-WS.org, 2월 28, 2026에 액세스, [https://ceur-ws.org/Vol-3606/paper56.pdf](https://ceur-ws.org/Vol-3606/paper56.pdf)  
19. (PDF) Effective Heuristics for Finding Small Minimal Feedback Arc Set Even for Large Graphs \- ResearchGate, 2월 28, 2026에 액세스, [https://www.researchgate.net/publication/384108254\_Effective\_Heuristics\_for\_Finding\_Small\_Minimal\_Feedback\_Arc\_Set\_Even\_for\_Large\_Graphs](https://www.researchgate.net/publication/384108254_Effective_Heuristics_for_Finding_Small_Minimal_Feedback_Arc_Set_Even_for_Large_Graphs)  
20. What are the most efficient algorithms for detecting cycles in a directed graph?, 2월 28, 2026에 액세스, [https://stackoverflow.com/questions/78879671/what-are-the-most-efficient-algorithms-for-detecting-cycles-in-a-directed-graph](https://stackoverflow.com/questions/78879671/what-are-the-most-efficient-algorithms-for-detecting-cycles-in-a-directed-graph)  
21. Cycle Detection :: Graph Data Science Library, 2월 28, 2026에 액세스, [https://docs.tigergraph.com/graph-ml/3.10/pathfinding-algorithms/cycle-detection](https://docs.tigergraph.com/graph-ml/3.10/pathfinding-algorithms/cycle-detection)  
22. Semantic networks and spreading activation (video) \- Khan Academy, 2월 28, 2026에 액세스, [https://www.khanacademy.org/science/health-and-medicine/executive-systems-of-the-brain/cognition-lesson/v/semantic-networks-and-spreading-activation](https://www.khanacademy.org/science/health-and-medicine/executive-systems-of-the-brain/cognition-lesson/v/semantic-networks-and-spreading-activation)  
23. Spreading activation \- Wikipedia, 2월 28, 2026에 액세스, [https://en.wikipedia.org/wiki/Spreading\_activation](https://en.wikipedia.org/wiki/Spreading_activation)  
24. Leveraging Spreading Activation for Improved Document ... \- arXiv.org, 2월 28, 2026에 액세스, [https://arxiv.org/pdf/2512.15922](https://arxiv.org/pdf/2512.15922)  
25. Which One to Choose: Random Walks or Spreading Activation ..., 2월 28, 2026에 액세스, [https://www.researchgate.net/publication/290926040\_Which\_One\_to\_Choose\_Random\_Walks\_or\_Spreading\_Activation](https://www.researchgate.net/publication/290926040_Which_One_to_Choose_Random_Walks_or_Spreading_Activation)  
26. Which One to Choose: Random Walks or Spreading Activation? \- reposiTUm, 2월 28, 2026에 액세스, [https://repositum.tuwien.at/handle/20.500.12708/55911](https://repositum.tuwien.at/handle/20.500.12708/55911)  
27. KNOWLEDGE GRAPH-BASED WEIGHTING STRATEGIES FOR A SCHOLARLY PAPER RECOMMENDATION SCENARIO \- CinfonIA, 2월 28, 2026에 액세스, [https://cinfonia.uniandes.edu.co/publications/knowledge-graph-based-weighting-strategies-for-a-scholarly-paper-recommendation-scenario/](https://cinfonia.uniandes.edu.co/publications/knowledge-graph-based-weighting-strategies-for-a-scholarly-paper-recommendation-scenario/)  
28. Knowledge graph-based weighting strategies for a scholarly paper recommendation scenario \- CEUR-WS.org, 2월 28, 2026에 액세스, [https://ceur-ws.org/Vol-2290/kars2018\_paper2.pdf](https://ceur-ws.org/Vol-2290/kars2018_paper2.pdf)  
29. Calculating the semantic distance between two documents using a hierarchical thesaurus, 2월 28, 2026에 액세스, [https://abilian.com/en/news/calculating-the-semantic-distance-between-two-documents-using-a-hierarchical-thesaurus/](https://abilian.com/en/news/calculating-the-semantic-distance-between-two-documents-using-a-hierarchical-thesaurus/)  
30. HybridRAG: Merging Structured and Unstructured Data for Cutting-Edge Information Extraction | ADaSci Blog, 2월 28, 2026에 액세스, [https://adasci.org/blog/hybridrag-merging-structured-and-unstructured-data-for-cutting-edge-information-extraction](https://adasci.org/blog/hybridrag-merging-structured-and-unstructured-data-for-cutting-edge-information-extraction)  
31. HybridRAG and Why Combine Vector Embeddings with Knowledge Graphs for RAG?, 2월 28, 2026에 액세스, [https://memgraph.com/blog/why-hybridrag](https://memgraph.com/blog/why-hybridrag)  
32. Global Community Summary Retriever \- GraphRAG, 2월 28, 2026에 액세스, [https://graphrag.com/reference/graphrag/global-community-summary-retriever/](https://graphrag.com/reference/graphrag/global-community-summary-retriever/)  
33. Hybrid Retrieval-Augmented Generation: Semantic and Structural Integration for Large Language Model Reasoning \- MDPI, 2월 28, 2026에 액세스, [https://www.mdpi.com/2076-3417/16/5/2244](https://www.mdpi.com/2076-3417/16/5/2244)  
34. From Local to Global: A GraphRAG Approach to Query-Focused Summarization \- arXiv, 2월 28, 2026에 액세스, [https://arxiv.org/html/2404.16130v2](https://arxiv.org/html/2404.16130v2)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEoAAAAWCAYAAABnnAr9AAAB+ElEQVR4Xu2Wuy9EQRSHT7xCgkQiOjQavcSj2SBBpZJoxEaC6D1Cr9IQUdBRK/wLiEIpOiQKRIGCRIIQnJOZ4d7fzp19Xdda90t+yd5vzt3dOTs7c4liYgqdPhT/gWbOOmeNUwtjNqY48yiLmRXOB2dUXzdxbjjPXxWpNHKuwd2Seh8Tub/TV0G0p8dMlv3DhUkJqS8rX97GG+cdpUbuq0SpkTG5N4gDTj/KQkYmdI7SQw+pml7wXZwXcF7MarFRzblEmQXlnFmUP8kVBU/GYFbcNvhXcu9Nrka5VlomyCqOrFEJUhPZBY/Ukaq7By+uCpyXoEZNchZQZomsyMgaJSvCtccYRkjVHXlcjXYuzKaOBO132SCfH1mjgn5x5JRUnTwGGLq1c7FDqqbV40449Z7rXImsUQ2UeaNsdWMWh8yQqhnX1y2c/e/hjGmzJMFZtXhJqJSSmsQTDgBDpOrw0SGpvYsOUjVb+jpdfRCDlgxzNi1eEjq2lYIE1ZgmuDCnpTx6bHAG/MN5EdlfT3gg92QvSI3LMwtiTsJ0mEbjiZkvkTZKkEkcoyR1Ysmp6ELurUAJmEbJ6gqTyBsl3JGazCGpPUtet/sq7EjdNEpAahZRhsCvNCpX5jiPKCPiTzVKkBVThjImFTnJzlDG2FniTKCMsZNEUQx8AnYNf+wKFS8NAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGUAAAAWCAYAAADZylKgAAAC/klEQVR4Xu2ZS8hNURiGP3cGrsXINQMDZSS3lFAyIQkj+UkkZkSGRpKQQsmAgQElKWJg8v/KwFCG7gnlUi7J/fa9fXtpnfesvfb+z9mXjv889dbZ7/ettddae++11t5HpEuXLvWwgo2CGK6awOZAZJrqtOqkagzFQuxQ7WezIH6yMdA4rvqj2pQcT1W9Vn39l9HMFNVLNhMGi9WXR0eSMj6/xOpw7FJ9k8ZyT7w4mOzFoI+N4c7BDd4tDiTgbv3NZgLKjWSTuCGWN5EDCYitIe+s6ip5DjfgaYxTvWCz00AHH7PpsUwsZzn5i8Tu3CyyBhE3A68bsfynYvFB5DvwhLVD7NyV8FyyG+GepEvk/5B8awnK8kCd8n73eb/Beom36bxYfB4HlJ2qvWz2k9i5S2eJWAP6yGfGi+W9Jx/eKPKYuWJ5R8n3O85P4DPVbfJ8touV380BSZ9m+0OtFwV3OhqQtSZsFMu763mjEy+L62J5q1QLVRvELu45P4lA/jY2PWaL5Vwm/4E0T4OtkKdfpYGT52nAfbE8bH0dSxMvC3eOg6pjqmvJMXZ2aSDOTw+DnFfe8SxVr3fcDnn6VQqTJP9FCeVtCXghkIMnkj2fxXSM+AzyGG4T15mHmWLTKwt1sQdh+18qQ8RO/oUDxDqxPN4u9yR+jAViOYfIx+bCgUV9rXcMUGY6eYx/Uc5Ia18U5qtWB4R62YPmWLFy4bstRFqOG/AYN8VysP6kEaoDHqbHGK5dw1TvKNYuoTZVxgeJNwC7INdxxu3IYqRdUMcJ1UU2xcpsZZNwm5TP0vjWXwSxNlcCGnCPTeWNNK8FDMrig2EI+IiHtqhYLx5Jeufx2aaXTQLTKcrz1FgEae2qlLdiDbkjtsbgN+bbLJC3h03lu9jLontSfOEi4bMNvgQ8dAWIzZI9MAckO6dVyqq3EvapPrFZEHUOTJ3nLgR0YCibBXBFdYHNisDOtKNZKfYmXQYdf8fWyWGJfxZplRGS/R7VJUIPGwWBfz7Hsvk/8hdDmtcuGC7lDwAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD4AAAAWCAYAAACYPi8fAAAB4UlEQVR4Xu2WTSsFURjHn7zFgqLYId9BeUkJJRslYSU3C2Wv5BNIQgplZ6ssxcLq2lnK0ttCssCCUt5fnqfnHI7/PTN3wh1u16/+NfM7z5k5c2bOzBD988936USRjdRyljmLnDJo8zHKmUCZTcxzXjlDZr+Gc865e69IpZpzhtKQR3q8KJkxfWLFDnAbGwxPnBeUBulXjBLYJK2rxAaDtPWgjAM58TFKh3bSmg7wzZx7cD7sXQ1CJrwCZaY5pfBBCfaJWAP/SNHWtvR9BrfkbCed7VhoJR1UEjxSTlp3BV5cCTiknrRuFrw72fgkZRy5Y1HW6CBp3a7jSo1LxwZpXTeniTNAOoErblHcpFt7ln3SOvlsWdqMS4c9xyRnjrNu9uWL8StUUfQL99UNe5wPqZEnC51LC+wjvvN/mXzSg91iA9BHWoefuoTxYTSS1kyBlxeqpZ/T6+z7+NELF6IcMKjGXlQYW6Q18j4IIt0xMsI1hZ/4hLS9EBvo400fRtCkWRY4qyjjQga2h5K5oNS1iUjfIpQG8dLu++Or4xxR+KTEwiXpIHZI17xsN3yq8CN1YyiZB9IfFnvH3chEyC+w/PEd2g7ZxjjnBmWuIHexAGUu0MU5QJkrTHNGUOYKCRR/kTeNIollnVaC1AAAAABJRU5ErkJggg==>

[image4]: <data:image/png;base64,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>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAXCAYAAADtNKTnAAAAsUlEQVR4XmNgGAWEQBcQfwTi/1D8HYjfoYldh6smAGAasIGfDLjlUABI0SF0QSjgYYDIN6CJo4AIBogiR3QJJIDPpWBwjYGAAgYiDCGogIEINSDJA+iCSMCNAaIGZyzBwsMBTRwZ3GaAqBFDl4ABQs40ZIDI16FLIAOQAlA6wAVA8k/QBZGBCgNEUTO6BBDIMUDk1qFLwEAgEJ9kQHjlDhAfh+KzUDFQ0jeFaRgFIw4AAFhqNpdzGLpuAAAAAElFTkSuQmCC>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAYCAYAAAAlBadpAAAAn0lEQVR4XmNgGAW7gPg/kRgnwKdgFRD/RheEAWYGiMZT6BJQwAvEB9EFYaCEAaLZA02cA0rzA3ETsgQy+MiA6eQqIFaBslmBmBtJDgWg+1cTjY8TwPyLDRME5QwQhX5IYnpAvBqJjxN8ZsC0JZUB4nSCgGgnogM2BojGk+gSxIAJDBDN4egS+MByBohf3wPxWyD+AMQ/gHg6sqJRMKQBAComL8cTwzU4AAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,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>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAYCAYAAACvKj4oAAACYUlEQVR4Xu2XPWgUURSFb1AixgSjYDREImgRLcSUYtSABAQbBatYaNBGEGysLP1BJYUgaGEXJClESSMWtkIICIKgWGghBkEksVBU/Nd7effp9XjvzI64SwL7wSEz5+x780525u0uUZMmEf2sYVUjyNfajEG9GGVtUjWCfK3TGCxivWH9MJrTbCPrPWRPNBNeQHbAZFIw4jDrDpoV6WHNoElOwcwHSov0yAU8jrJOoEnFBWWud2hW5BX5awoLPiB/gFBU8AsaSlHBehIWvEGpRDf4B1nfNUMus1aiqcy7gucpldgB/kfWlGaLIXsM5xavYBtrgrUBgwqsYN1kDWCghAWPUCoxYjxZTAdrXLM+kz0yxx5YcD3rNquV/LuhFnax7uqxzLHbZJmw4CClQWeNd1//ntJsj57Lf1FuzyKwYH5W99O/F7Qbk8xxxZxnwoKy7cqg63r+3GSHNDuu559NFoEFZQ5BxtYyHlnLWqrHyyitp/d3/IuwoCCD5F1bw7pg/O2aXWINsfaaLAILZmSefWhW5AzFd0Fpwbesb+DLzirZLSeL8ApepHhhVZA7IJqntKBI3iUkZ6sxCPAKyviHevzaBpQ2uVXgRcg819BUSgtGz4dkz9AsICq4ldXFOmn8LZpF74olP3/rMFBKC8oO6VHLxS1ewUlK8+Td2XKPNYumwzkqXkthwf+JV7CMr2g4yGsWbMGnaDDtlArJ8ynfpOR4xL4AmLcFX7Ja0GTGKJWSr3mfWNN/pH/T0ILLVbXgfWhnjrGuspZgYJDrdFIDC+6k9DvR+61YD/K1tmHQZCHzE+1tk9wLuAdmAAAAAElFTkSuQmCC>