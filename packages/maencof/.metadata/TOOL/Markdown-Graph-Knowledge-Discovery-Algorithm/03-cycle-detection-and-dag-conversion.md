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

#### 참고 자료

13. Sorting Heuristics for the Feedback Arc Set Problem, 2월 28, 2026에 액세스, [https://www.fim.uni-passau.de/fileadmin/dokumente/fakultaeten/fim/forschung/mip-berichte/mip1104.pdf](https://www.fim.uni-passau.de/fileadmin/dokumente/fakultaeten/fim/forschung/mip-berichte/mip1104.pdf)
14. Feedback arc set \- Wikipedia, 2월 28, 2026에 액세스, [https://en.wikipedia.org/wiki/Feedback\_arc\_set](https://en.wikipedia.org/wiki/Feedback_arc_set)
15. Algorithms for Detecting Cycles in Graphs: A Comprehensive Guide \- AlgoCademy Blog, 2월 28, 2026에 액세스, [https://algocademy.com/blog/algorithms-for-detecting-cycles-in-graphs-a-comprehensive-guide/](https://algocademy.com/blog/algorithms-for-detecting-cycles-in-graphs-a-comprehensive-guide/)
16. Detecting Cycles in a Directed Graph | Baeldung on Computer ..., 2월 28, 2026에 액세스, [https://www.baeldung.com/cs/detecting-cycles-in-directed-graph](https://www.baeldung.com/cs/detecting-cycles-in-directed-graph)
18. Effective Heuristics for Finding Small Minimal ... \- CEUR-WS.org, 2월 28, 2026에 액세스, [https://ceur-ws.org/Vol-3606/paper56.pdf](https://ceur-ws.org/Vol-3606/paper56.pdf)
21. Cycle Detection :: Graph Data Science Library, 2월 28, 2026에 액세스, [https://docs.tigergraph.com/graph-ml/3.10/pathfinding-algorithms/cycle-detection](https://docs.tigergraph.com/graph-ml/3.10/pathfinding-algorithms/cycle-detection)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEoAAAAWCAYAAABnnAr9AAAB+ElEQVR4Xu2Wuy9EQRSHT7xCgkQiOjQavcSj2SBBpZJoxEaC6D1Cr9IQUdBRK/wLiEIpOiQKRIGCRIIQnJOZ4d7fzp19Xdda90t+yd5vzt3dOTs7c4liYgqdPhT/gWbOOmeNUwtjNqY48yiLmRXOB2dUXzdxbjjPXxWpNHKuwd2Seh8Tub/TV0G0p8dMlv3DhUkJqS8rX97GG+cdpUbuq0SpkTG5N4gDTj/KQkYmdI7SQw+pml7wXZwXcF7MarFRzblEmQXlnFmUP8kVBU/GYFbcNvhXcu9Nrka5VlomyCqOrFEJUhPZBY/Ukaq7By+uCpyXoEZNchZQZomsyMgaJSvCtccYRkjVHXlcjXYuzKaOBO132SCfH1mjgn5x5JRUnTwGGLq1c7FDqqbV40449Z7rXImsUQ2UeaNsdWMWh8yQqhnX1y2c/e/hjGmzJMFZtXhJqJSSmsQTDgBDpOrw0SGpvYsOUjVb+jpdfRCDlgxzNi1eEjq2lYIE1ZgmuDCnpTx6bHAG/MN5EdlfT3gg92QvSI3LMwtiTsJ0mEbjiZkvkTZKkEkcoyR1Ysmp6ELurUAJmEbJ6gqTyBsl3JGazCGpPUtet/sq7EjdNEpAahZRhsCvNCpX5jiPKCPiTzVKkBVThjImFTnJzlDG2FniTKCMsZNEUQx8AnYNf+wKFS8NAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGUAAAAWCAYAAADZylKgAAAC/klEQVR4Xu2ZS8hNURiGP3cGrsXINQMDZSS3lFAyIQkj+UkkZkSGRpKQQsmAgQElKWJg8v/KwFCG7gnlUi7J/fa9fXtpnfesvfb+z9mXjv089dbZ7/ettddae++11t5HpEuXLvWwgo2CGK6awOZAZJrqtOqkagzFQuxQ7WezIH6yMdA4rvqj2pQcT1W9Vn39l9HMFNVLNhMGi9WXR0eSMj6/xOpw7FJ9k8ZyT7w4mOzFoI+N4c7BDd4tDiTgbv3NZgLKjWSTuCGWN5EDCYitIe+s6ip5DjfgaYxTvWCz00AHH7PpsUwsZzn5i8Tu3CyyBhE3A68bsfynYvFB5DvwhLVD7NyV8FyyG+GepEvk/5B8awnK8kCd8n73eb/Beom36bxYfB4HlJ2qvWz2k9i5S2eJWAP6yGfGi+W9Jx/eKPKYuWJ5R8n3O85P4DPVbfJ8touV380BSZ9m+0OtFwV3OhqQtSZsFMu763mjEy+L62J5q1QLVRvELu45P4lA/jY2PWaL5Vwm/4E0T4OtkKdfpYGT52nAfbE8bH0dSxMvC3eOg6pjqmvJMXZ2aSDOTw+DnFfe8SxVr3fcDnn6VQqTJP9FCeVtCXghkIMnkj2fxXSM+AzyGG4T15mHmWLTKwt1sQdh+18qQ8RO/oUDxDqxPN4u9yR+jAViOYfIx+bCgUV9rXcMUGY6eYx/Uc5Ia18U5qtWB4R62YPmWLFy4bstRFqOG/AYN8VysP6kEaoDHqbHGK5dw1TvKNYuoTZVxgeJNwC7INdxxu3IYqRdUMcJ1UU2xcpsZZNwm5TP0vjWXwSxNlcCGnCPTeWNNK8FDMrig2EI+IiHtqhYLx5Jeufx2aaXTQLTKcrz1FgEae2qlLdiDbkjtsbgN+bbLJC3h03lu9jLontSfOEi4bMNvgQ8dAWIzZI9MAckO6dVyqq3EvapPrFZEHUOTJ3nLgR0YCibBXBFdYHNisDOtKNZKfYmXQYdf8fWyWGJfxZplRGS/R7VJUIPGwWBfz7Hsvk/8hdDmtcuGC7lDwAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD4AAAAWCAYAAACYPi8fAAAB4UlEQVR4Xu2WTSsFURjHn7zFgqLYId9BeUkJJRslYSU3C2Wv5BNIQgplZ6ssxcLq2lnK0ttCssCCUt5fnqfnHI7/PTN3wh1u16/+NfM7z5k5c2bOzBD988936USRjdRyljmLnDJo8zHKmUCZTcxzXjlDZr+Gc865e69IpZpzhtKQR3q8KJkxfWLFDnAbGwxPnBeUBulXjBLYJK2rxAaDtPWgjAM58TFKh3bSmg7wzZx7cD7sXQ1CJrwCZaY5pfBBCfaJWAP/SNHWtvR9BrfkbCed7VhoJR1UEjxSTlp3BV5cCTiknrRuFrw72fgkZRy5Y1HW6CBp3a7jSo1LxwZpXTeniTNAOoErblHcpFt7ln3SOvlsWdqMS4c9xyRnjrNu9uWL8StUUfQL99UNe5wPqZEnC51LC+wjvvN/mXzSg91iA9BHWoefuoTxYTSS1kyBlxeqpZ/T6+z7+NELF6IcMKjGXlQYW6Q18j4IIt0xMsI1hZ/4hLS9EBvo400fRtCkWRY4qyjjQga2h5K5oNS1iUjfIpQG8dLu++Or4xxR+KTEwiXpIHZI17xsN3yq8CN1YyiZB9IfFnvH3chEyC+w/PEd2g7ZxjjnBmWuIHexAGUu0MU5QJkrTHNGUOYKCRR/kTeNIollnVaC1AAAAABJRU5ErkJggg==>
