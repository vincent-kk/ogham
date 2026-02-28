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

#### 참고 자료

22. Semantic networks and spreading activation (video) \- Khan Academy, 2월 28, 2026에 액세스, [https://www.khanacademy.org/science/health-and-medicine/executive-systems-of-the-brain/cognition-lesson/v/semantic-networks-and-spreading-activation](https://www.khanacademy.org/science/health-and-medicine/executive-systems-of-the-brain/cognition-lesson/v/semantic-networks-and-spreading-activation)
23. Spreading activation \- Wikipedia, 2월 28, 2026에 액세스, [https://en.wikipedia.org/wiki/Spreading\_activation](https://en.wikipedia.org/wiki/Spreading_activation)
25. Which One to Choose: Random Walks or Spreading Activation ..., 2월 28, 2026에 액세스, [https://www.researchgate.net/publication/290926040\_Which\_One\_to\_Choose\_Random\_Walks\_or\_Spreading\_Activation](https://www.researchgate.net/publication/290926040_Which_One_to_Choose_Random_Walks_or_Spreading_Activation)

[image4]: <data:image/png;base64,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>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAXCAYAAADtNKTnAAAAsUlEQVR4XmNgGAWEQBcQfwTi/1D8HYjfoYldh6smAGAasIGfDLjlUABI0SF0QSjgYYDIN6CJo4AIBogiR3QJJIDPpWBwjYGAAgYiDCGogIEINSDJA+iCSMCNAaIGZyzBwsMBTRwZ3GaAqBFDl4ABQs40ZIDI16FLIAOQAlA6wAVA8k/QBZGBCgNEUTO6BBDIMUDk1qFLwEAgEJ9kQHjlDhAfh+KzUDFQ0jeFaRgFIw4AAFhqNpdzGLpuAAAAAElFTkSuQmCC>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAYCAYAAAAlBadpAAAAn0lEQVR4XmNgGAW7gPg/kRgnwKdgFRD/RheEAWYGiMZT6BJQwAvEB9EFYaCEAaLZA02cA0rzA3ETsgQy+MiA6eQqIFaBslmBmBtJDgWg+1cTjY8TwPyLDRME5QwQhX5IYnpAvBqJjxN8ZsC0JZUB4nSCgGgnogM2BojGk+gSxIAJDBDN4egS+MByBohf3wPxWyD+AMQ/gHg6sqJRMKQBAComL8cTwzU4AAAAAElFTkSuQmCC>
