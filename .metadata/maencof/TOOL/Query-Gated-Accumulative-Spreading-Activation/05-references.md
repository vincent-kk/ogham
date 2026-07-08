# 참고 문헌

전 항목 2026-07-08 실존·내용 검증 완료(arXiv 원문 확인 또는 공식 소스).

## 확산 활성화 계열 (직접 선행 연구)

1. Makarov, I., Glybovets, M. **"Query-Aware Spreading Activation for Multi-Hop Retrieval over Knowledge Graphs."** arXiv:2606.30133 (2026). — 반복형 게이트 확산 `Δr = α·σ(v)·Σr(u)`(α=0.7, τ=0.01, T=3), semantic gate σ(v)=max(cos(e_v,e_q),0). HippoRAG 대비 MuSiQue EM +5.3 / F1 +3.4, 지연 1.5–4.9× 단축. QGA-SA 게이트·반복 구조의 직접 원형.
2. Pavlović, J., Krész, M., Hajdu, L. **"Leveraging Spreading Activation for Improved Document Retrieval in Knowledge-Graph-Based RAG Systems."** arXiv:2512.15922 (2025). — `a_j = min(1, a_j + Σ a_i·w_ij)` clamp 합산, 엣지 rescale `w'=(w−c)/(1−c)` c=0.4. HippoRAG 2 상회(MuSiQue 75% vs 70%). QGA-SA 누적식의 직접 원형.
3. Crestani, F. **"Application of Spreading Activation Techniques in Information Retrieval."** Artificial Intelligence Review 11:453–482 (1997); Crestani & Lee, IP&M 36(4) (2000). — constrained SA의 정본.
4. Collins, A.M., Loftus, E.F. **"A Spreading-Activation Theory of Semantic Processing."** Psychological Review 82(6) (1975). — 현행 v1 설계의 인지과학 기반(기존 설계서가 인용).
5. Benotman, H., Maier, D. **"Comparing Personalized PageRank and Activation Spreading in Wikipedia Diagram Retrieval."** JCDL 2021. — SA vs PPR 위상 의존성, 보편 우위 부재.

## PPR / Graph-RAG 계열

6. Gutiérrez, B.J. et al. **"HippoRAG: Neurobiologically Inspired Long-Term Memory for LLMs."** NeurIPS 2024, arXiv:2405.14831. — PPR damping 0.5, node specificity 1/|P_i|, synonymy edge cos>0.8.
7. Gutiérrez, B.J. et al. **"From RAG to Memory: Non-Parametric Continual Learning for LLMs (HippoRAG 2)."** ICML 2025, arXiv:2502.14802.
8. Edge, D. et al. **"From Local to Global: A Graph RAG Approach to Query-Focused Summarization."** arXiv:2404.16130 (2024); **LazyGraphRAG**, Microsoft Research Blog (2024-11).
9. Guo, Z. et al. **"LightRAG."** arXiv:2410.05779. / Chen, B. et al. **"PathRAG."** arXiv:2502.14902. / **fast-graphrag**, github.com/circlemind-ai. / Fan, T. et al. **"MiniRAG."** arXiv:2501.06713. / Huang, Y. et al. **"KET-RAG."** arXiv:2502.09304. / Sarthi, P. et al. **"RAPTOR."** arXiv:2401.18059. / Ma, S. et al. **"Think-on-Graph 2.0."** arXiv:2407.10805.

## 에이전트 메모리 / 인지 모델

10. Anderson, J.R., Schooler, L.J. (1991); Anderson, J.R. et al. **"An Integrated Theory of the Mind (ACT-R)."** Psychological Review (2004). — base-level activation `B_i = ln(Σ t_j^{-d})`, d=0.5.
11. Park, J.S. et al. **"Generative Agents: Interactive Simulacra of Human Behavior."** UIST 2023, arXiv:2304.03442. — recency·importance·relevance 등가중 융합, 지수 감쇠 0.99.
12. Zhong, W. et al. **"MemoryBank: Enhancing LLMs with Long-Term Memory."** AAAI 2024, arXiv:2305.10250. — Ebbinghaus `R = e^{-t/S}`, spacing effect.
13. Xu, W. et al. **"A-MEM: Agentic Memory for LLM Agents."** NeurIPS 2025, arXiv:2502.12110. — Zettelkasten 동적 링크 진화.
14. **Zep/Graphiti** (getzep/graphiti), **Mem0** arXiv:2504.19413. — 시간 인지 그래프 메모리, CRUD 동기화.

## 랭킹 / 구조 알고리즘

15. Cormack, G.V., Clarke, C.L.A., Büttcher, S. **"Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods."** SIGIR 2009. — RRF k=60.
16. Carbonell, J., Goldstein, J. **"The Use of MMR, Diversity-Based Reranking."** SIGIR 1998.
17. Traag, V.A., Waltman, L., van Eck, N.J. **"From Louvain to Leiden: Guaranteeing Well-Connected Communities."** Scientific Reports 9:5233 (2019). / Blondel, V.D. et al. (2008, Louvain). / Raghavan, U.N. et al. (2007, LPA).
18. Robertson, S., Zaragoza, H. **"The Probabilistic Relevance Framework: BM25 and Beyond."** (BM25F).

## 평가 자원

19. Wisoff, J. et al. **"NoteBar: An AI-Assisted Note-Taking System for Personal Knowledge Management."** arXiv:2509.03610 (2025). — PKM 노트 데이터셋(3,173 노트/8,494 주석 개념) — T3 교차 검증 후보.
20. 개인 지식 볼트 특화 통제 검색 평가: **문헌 부재 확인**(2024–2026 조사) — 자체 골든셋 구축(03장)의 근거.
