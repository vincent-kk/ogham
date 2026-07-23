# 핸드오프 프롬프트 — seiri Phase 0

> 아래 코드펜스 안을 그대로 복사해 작업환경(ogham) 에이전트에게 전달한다.

```text
seiri 플러그인의 Phase 0(규칙 검증)을 이어받아라. 브랜치 feature/97-98.

## 먼저 읽어라 (이 순서로)
1. .metadata/seiri/README.md — 정체성·현재 상태
2. .metadata/seiri/TODO.md — "지금 사용자가 할 일" + "Phase 0" + "Phase 4b" 절
3. .metadata/seiri/phase0/s1-agent-legible.md — S1 방법론·대조군 결과·샘플 원문

## 현재 위치
- S1 agent-legible 대조군 완료: 유효 표본 5/5 전원 F1 실패 후보, 분산 극저.
- 판정은 사용자 판독이 내린다. 사용자가 이 프롬프트와 함께 판정을 주지
  않았다면, V1~V5 판독 결과를 먼저 물어라 — 질문 하나로.

## 판정이 "실패 맞다"이면 — S1 처치군 5회
1. phase0/s1-agent-legible.md의 대조군 프롬프트 앞에 03-RULES.md S1
   코드펜스 전문을 전치해 처치군 프롬프트를 만든다(문서의 "처치군" 절 형식).
   프롬프트의 나머지는 자구 동일 — 한 글자도 바꾸지 마라.
2. 반드시 격리된 빈 스크래치 디렉터리를 cwd로 실행한다. provider CLI는
   답변 대신 cwd에 실제 파일을 쓴다 — 라운드 1에서 저장소가 실제로
   오염됐다(실행 노트 참조). 표본마다 새 디렉터리.
3. cennad start_conversation 직접 호출(project_root=스크래치), 5회.
   antigravity는 CLI 고장으로 제외 — claude·codex만 쓴다.
4. 응답 원문을 무편집으로 phase0 파일의 결과표와 샘플 절에 추가한다.
   판정하지 마라 — F1(새 파일 안에 자동 발견·파일명-키 표지가 있는가) /
   F2(산문에만 설명) 후보 표시까지만. 판독은 사용자 몫이다.
5. 처치군 5회가 끝나면 사용자에게 판독을 요청하고 멈춰라.

## 그 후 (사용자 지시에 따라)
- S2 public-contract → S3 test-validity: 같은 방법론. 유혹 시나리오
  설계부터 — 03-RULES.md의 각 판정 노트가 겨냥 실패를 말해준다.
  대조군 먼저: 실패가 안 나오면 그 규칙은 만들지 않는다.
- S4~S8 이관본: filid 운영 실적이 대용 증거 — 표본 축소 가능.
- S7·S8은 D8(스킬과의 중복 — TODO의 Phase 4b 대조표) 검토를 함께.
- D7 스킬 디스패치 테스트는 별도 트랙: 실제 Claude Code 하니스에 seiri를
  설치하고 순간별 유혹 세션으로 자동 스킬 발화율을 잰다(TODO Phase 4b).
- 통과 룰 확정 후 A-1c(templates/rules/ 추출·manifest 등재·빌드)는
  "Phase 0 › 통과 후" 절 절차 그대로.

## 규약 (어기지 마라)
- 커밋은 src/·skills/·문서만. bridge/·public/은 사용자가 직접 커밋한다.
- 커밋 전 루트 prettier 실행(Stop 훅과 정합), yarn seiri test:run green 확인.
- templates/rules/는 루트 .prettierignore 보호 대상 — 포매팅 금지
  (templateHash 무효화 사고 방지).
- 결과 기록에 근거 없는 수치·단정 금지. 원문 보존이 최우선이다.
```
