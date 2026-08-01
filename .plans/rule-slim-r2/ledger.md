# rule-slim-r2 — 진행 원장

> 태스크당 1줄: 무엇이, 어디에, 어떻게 검증됐나. 이탈은 사유와 함께 같은 턴에 기록.

- [계획] `.plans/rule-slim-r2/plan.md` 작성 완료. 사전 검토: workspace 명칭은 T5에서 검증, 픽스처 바이트 안정성 위해 `.prettierignore`에 rule-bench 경로 추가 예정(이탈 아님 — 계획 검토에서 발견, T1에 편입).
- [T1] 완료 — `.metadata/rule-bench/` 골격(README·prepare·grade·apply-rules-sync) + 이슈 iA~iJ 10종. 검증: `grade.mjs --selftest` 10/10 판별(base 실패·naive hidden 미달·correct 전부 통과), prepare→grade 스모크(iA-R0 기본 상태 shown 0/1·hidden 0/3). 이탈 기록: `.prettierignore`에 `.metadata/rule-bench/` 추가(계측 바이트 안정성); 픽스처 INTENT.md로 filid 훅이 .metadata 재분류 경고를 내지만 `.filid/config.json`의 `additionalExcludedDirectories`에 `.metadata`가 이미 있어 스캔 무영향(세션 훅 알림만).
- [T2] 완료 — arms/R1 현행 14종(57,651B), arms/R2 압축 14종(43,358B, 총 -24%; 상시 11종 42,617→32,410B, -23%). 검증: 불변식 grep 전부 통과(Precedence·grounding·B6 쌍·seiri 임계 유일 `8 lines`·러너 0건·관용구 2종·조건부 3종 frontmatter·globs 0건·전 파일 ≤200줄). 압축 방식: 골격 상용구 1줄화 + 정당화 산문/볼드 테제/Ask-yourself(reuse-first §1 하나만 유지) 제거, 규범 내용·레시피·표·문법 블록은 전부 보존. 규범 삭제는 T4에서 R0 증거 기반으로만.
- [T3] 완료 — 80/80 채점. 전 이슈 R2 ≥ R1(동률 9종 + iC 양측 리프트), 회귀 0. iC: R0 0/6 vs R1 9/9 = R2 9/9. iH 전 암 3/4·iJ 전 암 1/4 동률(산문 규칙 길이 무관 미달 — 도구 집행 영역). shown 80/80. iE finalMention 전 암 0.
- [T4] 완료 — 재실행 불요(게이트 전부 통과). 삭제 숙고 목록은 results 문서에 조항 단위로 기록(포화 계기를 S1·S2 삭제 근거로 쓰지 않음 — Phase 0 반전 실측 우선; 프로세스 규칙은 SYNTHESIS 원칙 유지).
- [T5] (진행 중) R2 → templates 14종 반영, build:rules 해시 재주입(10+4), seiri test:run 159/159 · filid 956 passed(7 skipped 기존), apply-rules-sync로 .claude/rules 14종 + AGENTS.md 마커 14구간 동기화·바이트 일치 검증, 03-RULES.md v2 개정 노트(B1·B6 상용구 1줄화 + 재단·배포 절). 이탈 기록: 배포는 filid DETAIL이 말하는 rule_docs_sync(MCP) 대신 apply-rules-sync.mjs 사용 — 실행 중 MCP는 캐시된 구판 플러그인이라 편집된 템플릿을 배포하지 못함(feedback_verify_plugin_src_via_tsx 선례). 잔여: 신선 서브에이전트 정적 리뷰 결과 수령.
- [T5-리뷰] 완료 — receive-review로 판정: 수용 6(반영 후 해시 재주입 3+2·두 스위트 exit 0·3면 패리티 재확인), 기각 8(v1 계승·헌법 소관, results 문서에 근거 기록). 최종 절감 57,651→43,582B(-24%)·상시 42,617→32,634B(-23%).
- [T6] 완료 — 최종 verify 배터리 신선 재실행: seiri 159/159 · filid 956 passed(7 skipped 기존) · 하네스 selftest 10/10 exit 0 · .claude/rules 14/14 바이트 동일(AGENTS.md 14구간 패리티는 리뷰 반영 직후 런에서 OK) · 워킹트리 34파일 +355/-1521(추적분) + rule-bench/plans 신규. results 정본 `.metadata/rule-bench/results/2026-08-01-r2.md`. 커밋·버전 범프·릴리즈는 사용자 결정으로 남김.
