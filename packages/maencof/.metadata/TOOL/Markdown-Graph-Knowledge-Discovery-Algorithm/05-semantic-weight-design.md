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

#### 참고 자료

27. KNOWLEDGE GRAPH-BASED WEIGHTING STRATEGIES FOR A SCHOLARLY PAPER RECOMMENDATION SCENARIO \- CinfonIA, 2월 28, 2026에 액세스, [https://cinfonia.uniandes.edu.co/publications/knowledge-graph-based-weighting-strategies-for-a-scholarly-paper-recommendation-scenario/](https://cinfonia.uniandes.edu.co/publications/knowledge-graph-based-weighting-strategies-for-a-scholarly-paper-recommendation-scenario/)
28. Knowledge graph-based weighting strategies for a scholarly paper recommendation scenario \- CEUR-WS.org, 2월 28, 2026에 액세스, [https://ceur-ws.org/Vol-2290/kars2018\_paper2.pdf](https://ceur-ws.org/Vol-2290/kars2018_paper2.pdf)
29. Calculating the semantic distance between two documents using a hierarchical thesaurus, 2월 28, 2026에 액세스, [https://abilian.com/en/news/calculating-the-semantic-distance-between-two-documents-using-a-hierarchical-thesaurus/](https://abilian.com/en/news/calculating-the-semantic-distance-between-two-documents-using-a-hierarchical-thesaurus/)

[image7]: <data:image/png;base64,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>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAYCAYAAACvKj4oAAACYUlEQVR4Xu2XPWgUURSFb1AixgSjYDREImgRLcSUYtSABAQbBatYaNBGEGysLP1BJYUgaGEXJClESSMWtkIICIKgWGghBkEksVBU/Nd7effp9XjvzI64SwL7wSEz5+x780525u0uUZMmEf2sYVUjyNfajEG9GGVtUjWCfK3TGCxivWH9MJrTbCPrPWRPNBNeQHbAZFIw4jDrDpoV6WHNoElOwcwHSov0yAU8jrJOoEnFBWWud2hW5BX5awoLPiB/gFBU8AsaSlHBehIWvEGpRDf4B1nfNUMus1aiqcy7gucpldgB/kfWlGaLIXsM5xavYBtrgrUBgwqsYN1kDWCghAWPUCoxYjxZTAdrXLM+kz0yxx5YcD3rNquV/LuhFnax7uqxzLHbZJmw4CClQWeNd1//ntJsj57Lf1FuzyKwYH5W99O/F7Qbk8xxxZxnwoKy7cqg63r+3GSHNDuu559NFoEFZQ5BxtYyHlnLWqrHyyitp/d3/IuwoCCD5F1bw7pg/O2aXWINsfaaLAILZmSefWhW5AzFd0Fpwbesb+DLzirZLSeL8ApepHhhVZA7IJqntKBI3iUkZ6sxCPAKyviHevzaBpQ2uVXgRcg819BUSgtGz4dkz9AsICq4ldXFOmn8LZpF74olP3/rMFBKC8oO6VHLxS1ewUlK8+Td2XKPNYumwzkqXkthwf+JV7CMr2g4yGsWbMGnaDDtlArJ8ynfpOR4xL4AmLcFX7Ja0GTGKJWSr3mfWNN/pH/T0ILLVbXgfWhnjrGuspZgYJDrdFIDC+6k9DvR+61YD/K1tmHQZCHzE+1tk9wLuAdmAAAAABJRU5ErkJggg==>
