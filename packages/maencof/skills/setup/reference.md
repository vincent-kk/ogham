# setup — Reference

Comprehensive reference for the setup skill's output templates, field generation rules, and document templates.

Load this file when executing any setup stage to access output templates and generation rules.

## Stage 1 Templates — Welcome + Path Setup

### T1-1: Welcome Message

```
maencof에 오신 것을 환영합니다.
개인 지식 공간을 함께 만들어 보겠습니다.

먼저, 지식을 저장할 폴더 경로를 정해야 합니다.
기본 경로는 ~/.maencof/ 입니다.
```

### T1-2: Path Confirmation

```
지식 공간 경로: {path}
이 경로에 지식 공간을 생성할까요?
```

### T1-3: Directory Creation Report

```
생성된 디렉토리:
- {path}/.maencof/ (캐시)
- {path}/.maencof-meta/ (메타데이터)

기본 설정 파일:
{provisioned_files_list}
```

## Stage 2 Templates — Core Identity Interview

### T2-Q1: Name

- Question: "어떤 이름으로 불러드릴까요?"
- Hint: "본명, 닉네임, 호칭 모두 가능합니다."
- Options: ["본명 사용", "닉네임 입력", "나중에 정할게"]

### T2-Q2: Core Values

- Question: "지식을 쌓고 관리할 때 가장 중요하게 생각하는 가치 3가지를 골라주세요."
- Options (select up to 3): ["정확성", "실용성", "창의성", "체계성", "깊이", "폭넓음", "직관", "효율", "직접 입력"]
- Note: Scoped to knowledge management context. "직접 입력" allows custom values.

### T2-Q3: Boundary

- Question: "제가 절대 하지 말아야 할 행동이 있다면 하나만 알려주세요."
- Hint: "예: '내 파일을 허락 없이 삭제하지 마', '확인 없이 외부에 공유하지 마'"
- Options: ["허락 없이 파일 삭제 금지", "확인 없이 정보 공유 금지", "근거 없는 추측 금지", "직접 입력", "나중에 정할게"]
- Note: Scoped to AI behavior boundaries.

### T2-Q4: Primary Interest

- Question: "요즘 가장 관심 있는 분야나 프로젝트가 무엇인가요?"
- Hint: "예: 'AI 논문 정리', '사이드 프로젝트 관리', '독서 기록'"
- Options: ["AI/ML", "소프트웨어 개발", "독서/학습", "프로젝트 관리", "직접 입력"]

### T2-Q5: Communication Style

- Question: "어떤 말투를 선호하세요?"
- Options: ["간결하고 핵심만", "친근하고 대화하듯", "정중하고 격식있게", "직접 입력"]
- Note: Constrained to 3 concrete choices + custom option.

### T2-Q6: Occupation/Role (Optional)

- Question: "현재 하시는 일이나 역할은 무엇인가요?"
- Options: ["개발자", "연구자", "학생", "기획자/PM", "디자이너", "직접 입력", "건너뛰기"]

### T2-Q7: Long-term Goals (Optional)

- Question: "장기적으로 이루고 싶은 목표가 있다면 알려주세요."
- Hint: "예: '기술 블로그 운영', '논문 출판', '사이드 프로젝트 런칭'"
- Options: ["직접 입력", "건너뛰기"]

### T2-Q8: Learning Style (Optional)

- Question: "새로운 것을 배울 때 선호하는 방식이 있나요?"
- Options: ["직접 해보기", "문서/책 읽기", "영상 시청", "토론/질문", "직접 입력", "건너뛰기"]

### T2-Q9: Decision Criteria (Optional)

- Question: "중요한 결정을 내릴 때 가장 중시하는 기준은 무엇인가요?"
- Options: ["데이터/근거", "직관/경험", "효율/속도", "안정성/리스크", "직접 입력", "건너뛰기"]

### T2-Q10: Daily Routine (Optional)

- Question: "하루 중 가장 생산적인 시간대나 루틴이 있나요?"
- Options: ["아침형", "저녁형", "불규칙", "직접 입력", "건너뛰기"]

### T2-SKIP: Skip Response

```
이 질문은 건너뛰겠습니다. 나중에 /maencof:setup --step 2 로 다시 설정할 수 있습니다.
```

### T2-DONE: Stage Completion Summary

```
기본 정보 수집이 완료되었습니다.

이름: {name}
핵심 가치: {values}
경계: {boundary}
관심 분야: {interest}
소통 방식: {style}

다음 단계에서 AI 동반자를 설정합니다.
```

## Stage 3 Templates — AI Companion Identity

### T3-1: Field Generation Rules

Generate companion identity fields by mapping interview answers to `CompanionIdentitySchema` fields:

| Field | Rule | Example |
|-------|------|---------|
| `name` | 2-4 syllable Korean or English name. Relate to user's primary interest or values. | "아카" (from 정확성), "노트" (from note-taking), "Sage" (from 깊이) |
| `role` | One-sentence: "{domain} {function}" format. | "지식 정리 파트너", "학습 기록 도우미", "프로젝트 기억 관리자" |
| `personality.tone` | Map from communication style answer. | "간결하고 핵심만" → "간결체", "친근하고 대화하듯" → "친근체", "정중하고 격식있게" → "존댓말", custom → closest match |
| `personality.approach` | Select from constrained set based on values. | Options: "분석적", "실용적", "탐구적", "체계적" |
| `personality.traits` | Exactly 3 traits. Derive from top 2 values + communication style. | values=["정확성","체계성"], style="간결" → ["꼼꼼한","체계적인","간결한"] |
| `principles` | Map 1:1 from core values. One principle per value. | "정확성" → "출처와 근거를 항상 확인합니다" |
| `taboos` | Map directly from boundary answer. Include as-is. | "허락 없이 파일 삭제 금지" → "사용자 허락 없이 파일을 삭제하지 않습니다" |
| `origin_story` | Exactly 2 sentences. Format: "{name}은(는) {user_interest}을(를) 돕기 위해 만들어졌습니다. {value_connection}." | "아카는 AI 논문을 체계적으로 정리하기 위해 만들어졌습니다. 정확성과 깊이를 중시하는 당신의 가치에 맞춰 동작합니다." |
| `greeting` | Format: "[maencof:{name}] {1-sentence greeting with user's name}" | "[maencof:아카] 안녕하세요, {user_name}님. 오늘도 함께 정리해볼까요?" |

### T3-2: Persona Presentation

```
AI 동반자를 생성했습니다.

이름: {name}
역할: {role}
성격: {tone} / {approach}
특성: {traits_joined}
원칙: {principles_joined}
금기: {taboos_joined}

인사: {greeting}

이 동반자를 사용할까요?
```

Options: ["사용", "다시 생성", "건너뛰기"]

## Stage 4 Templates — Knowledge Tree Scaffolding

### T4-1: L1 Document Content Templates

#### 01_Core/identity.md

Frontmatter:

```yaml
---
id: identity
layer: 1
created: {ISO_DATE}
tags: [identity, core]
title: 기본 정보
---
```

Body:

```markdown
# 기본 정보

- 이름: {name}
- 역할: {occupation or "미설정"}
```

#### 01_Core/values.md

Frontmatter:

```yaml
---
id: values
layer: 1
created: {ISO_DATE}
tags: [values, core]
title: 핵심 가치
---
```

Body:

```markdown
# 핵심 가치

{for each value}
- **{value}**
{end}
```

#### 01_Core/boundaries.md

Frontmatter:

```yaml
---
id: boundaries
layer: 1
created: {ISO_DATE}
tags: [boundaries, core]
title: 경계
---
```

Body:

```markdown
# 경계

- {boundary}
```

#### 01_Core/preferences.md

Frontmatter:

```yaml
---
id: preferences
layer: 1
created: {ISO_DATE}
tags: [preferences, core]
title: 소통 방식
---
```

Body:

```markdown
# 소통 방식

- 선호 방식: {communication_style}
```

### T4-2: Stage Completion Report

```
지식 트리를 생성했습니다.

생성된 문서:
- 01_Core/identity.md
- 01_Core/values.md
- 01_Core/boundaries.md
- 01_Core/preferences.md

생성된 디렉토리:
- 02_Derived/
- 03_External/ (relational/, structural/, topical/)
- 04_Action/
- 05_Context/ (buffer/, boundary/)
```

## Stage 6 Templates — Index Build

### T6-1: New Vault Index Report

```
지식 트리 인덱스를 생성합니다...
생성 완료. 노드 {count}개가 인덱싱되었습니다.
```

### T6-2: Existing Vault Prompt

```
기존 마크다운 문서가 감지되었습니다. ({count}개 파일)
전체 인덱스를 빌드할까요?
```

Options: ["빌드 실행", "나중에 하기"]

## Stage 7 Templates — Completion Guide

### T7-1: Completion Message

```
설정이 완료되었습니다!

지식 공간 경로: {vault_path}
생성된 문서: {doc_count}개
인덱스 상태: {index_status}

다음 명령어로 시작해보세요:
- /maencof:remember — 새로운 지식 기록
- /maencof:recall — 기억 검색
- /maencof:build — 전체 인덱스 빌드
- /maencof:checkup — 시스템 상태 확인
```
