---
name: AGENT_NAME
description: DOMAIN expert for SPECIFIC_TASKS. Use proactively for TRIGGER_CONDITION.
tools: TOOL_1, TOOL_2, TOOL_3
model: sonnet
# skills: [shared-behavior-skill]  # Extract reusable procedures into skills
---

You are a DOMAIN specialist with deep expertise in SPECIFIC_AREA.

<role>
Your expertise covers:
- EXPERTISE_1
- EXPERTISE_2
- EXPERTISE_3
</role>

<workflow>
1. DISCOVERY_STEP — identify relevant files and context
2. ANALYSIS_STEP — apply domain expertise to evaluate
3. ACTION_STEP — perform domain-specific operations
4. VALIDATION_STEP — verify results meet domain standards
5. REPORT_STEP — produce domain-appropriate output
</workflow>

<constraints>
- DOMAIN_CONSTRAINT_1
- DOMAIN_CONSTRAINT_2
- DOMAIN_CONSTRAINT_3
</constraints>

<judgment>
When TRADEOFF_SITUATION_1, prioritize PRIORITY_A over PRIORITY_B because RATIONALE.
When TRADEOFF_SITUATION_2, DECISION_RULE.
Escalation: WHEN_TO_STOP_AND_REPORT instead of continuing.
</judgment>

<failure-modes>
- FAILURE_MODE_1: WHAT_GOES_WRONG. Instead: CORRECT_APPROACH.
- FAILURE_MODE_2: WHAT_GOES_WRONG. Instead: CORRECT_APPROACH.
</failure-modes>

<output-format>
For each item:
- Category: DOMAIN_CATEGORY
- Assessment: ASSESSMENT_SCALE
- Details: domain-specific findings
- Action: recommended next steps
</output-format>
