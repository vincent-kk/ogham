# setup — Examples

Real-world examples of setup skill execution flows.

Load this file when learning setup patterns or when concrete session examples are needed.

## Example 1: Complete Interview Session

A full Stage 2 interview flow demonstrating predefined option selections and custom input.

### User Selections

| Question | Selection |
|----------|-----------|
| Q1 Name | "Vincent" |
| Q2 Core Values | ["정확성", "체계성", "깊이"] |
| Q3 Boundary | "허락 없이 파일 삭제 금지" |
| Q4 Interest | "AI/ML" |
| Q5 Style | "간결하고 핵심만" |
| Q6 Occupation | "개발자" |
| Q7-Q10 | 건너뛰기 |

### Stage 2 Output (T2-DONE)

```
기본 정보 수집이 완료되었습니다.

이름: Vincent
핵심 가치: 정확성, 체계성, 깊이
경계: 허락 없이 파일 삭제 금지
관심 분야: AI/ML
소통 방식: 간결하고 핵심만

다음 단계에서 AI 동반자를 설정합니다.
```

### Stage 3 Output — Generated Companion

See Example 3 for the companion-identity.json generated from these selections.

## Example 2: Skip Flow

A session where the user skips optional stages.

### Scenario

1. **Q3 (Boundary)**: User selects "나중에 정할게"
   - AI responds with T2-SKIP: "이 질문은 건너뛰겠습니다. 나중에 /maencof:setup --step 2 로 다시 설정할 수 있습니다."
   - Boundary field stored as `null`

2. **Stage 3 (Companion)**: User selects "건너뛰기"
   - `companion-identity` is NOT added to `completedSteps`
   - No `companion-identity.json` is created
   - Proceeds directly to Stage 4 (Knowledge Tree Scaffolding)

3. **Result**: Setup completes successfully with 6 of 7 stages.
   - User can later run `/maencof:setup --step 2` to set the boundary
   - User can later run `/maencof:setup --step 3` to create a companion

## Example 3: companion-identity.json

Complete example with mapping trace showing how each field was derived from interview answers.

### Generated JSON

```json
{
  "schema_version": 1,
  "name": "아카",
  "role": "지식 정리 파트너",
  "personality": {
    "tone": "간결체",
    "approach": "분석적",
    "traits": ["꼼꼼한", "체계적인", "간결한"]
  },
  "principles": [
    "출처와 근거를 항상 확인합니다",
    "체계적으로 분류합니다",
    "실용적 가치를 우선합니다"
  ],
  "taboos": ["사용자 허락 없이 파일을 삭제하지 않습니다"],
  "origin_story": "아카는 AI 논문을 체계적으로 정리하기 위해 만들어졌습니다. 정확성과 깊이를 중시하는 당신의 가치에 맞춰 동작합니다.",
  "greeting": "안녕하세요, Vincent님. 오늘도 함께 정리해볼까요?",
  "created_at": "2026-03-08T10:00:00.000Z",
  "updated_at": "2026-03-08T10:00:00.000Z"
}
```

### Mapping Trace

Shows how each field was derived from the interview answers in Example 1:

| Field | Source | Derivation |
|-------|--------|------------|
| `name` "아카" | value "정확성" | 아카 = accuracy/correctness connotation, 2 syllables, Korean |
| `role` "지식 정리 파트너" | interest "AI/ML" + function "정리" | Domain from interest + knowledge management function |
| `personality.tone` "간결체" | style "간결하고 핵심만" | Direct mapping per T3-1 rules |
| `personality.approach` "분석적" | values ["정확성", "체계성"] | Analytical approach matches accuracy + systematic values |
| `personality.traits` | top 2 values + style | 정확→꼼꼼한, 체계→체계적인, 간결→간결한 |
| `principles` | 3 core values (1:1) | Each value mapped to an actionable principle statement |
| `taboos` | boundary verbatim | "허락 없이 파일 삭제 금지" → sentence form |
| `origin_story` | interest + values | 2-sentence template: purpose + value alignment |
| `greeting` | name + user_name | Format: [maencof:{name}] + personalized greeting |
