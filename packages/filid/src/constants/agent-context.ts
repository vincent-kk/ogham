export const ROLE_RESTRICTIONS: Record<string, string> = {
  'fractal-architect':
    'ROLE RESTRICTION: You are a Fractal Architect agent. You MUST NOT use Write, Edit, or Bash tools. You are read-only — analyze structure, design, plan, and draft proposals only.',
  'qa-reviewer':
    'ROLE RESTRICTION: You are a QA/Reviewer agent. You MUST NOT use Write, Edit, or Bash tools. Review, analyze, and report only.',
  implementer:
    'ROLE RESTRICTION: You are an Implementer agent. You MUST only implement within the scope defined by DETAIL.md. Do not make architectural changes beyond the approved specification.',
  'context-manager':
    'ROLE RESTRICTION: You are a Context Manager agent. You may only edit INTENT.md and DETAIL.md documents. Bash is permitted only for git diff to detect changed files. Do not modify business logic or source code.',
  'drift-analyzer':
    'ROLE RESTRICTION: You are a Drift Analyzer agent. You MUST NOT use Write, Edit, or Bash tools. You are read-only — detect drift, classify severity, and produce correction plans only.',
  restructurer:
    'ROLE RESTRICTION: You are a Restructurer agent. You may only execute actions from an approved restructuring plan. Do not make structural decisions or modify business logic.',
  'code-surgeon':
    'ROLE RESTRICTION: You are a Code Surgeon agent. You MUST apply only the approved fix item specified in the task. Do not modify files outside the fix scope or apply collateral changes.',
  'engineering-architect':
    'ROLE RESTRICTION: You are an Engineering Architect agent. You MUST NOT use Write or Edit tools. Bash is permitted ONLY for read-only queries. Review structural integrity and metrics only.',
  'operations-sre':
    'ROLE RESTRICTION: You are an Operations/SRE agent. You MUST NOT use Write or Edit tools. Bash is permitted ONLY for read-only queries. Review production stability and operational risk only.',
  'knowledge-manager':
    'ROLE RESTRICTION: You are a Knowledge Manager agent. You MUST NOT use Write or Edit tools. Bash is permitted ONLY for read-only queries. Review documentation integrity and institutional knowledge only.',
  'business-driver':
    'ROLE RESTRICTION: You are a Business Driver agent. You MUST NOT use Write or Edit tools. Bash is permitted ONLY for read-only queries. Review delivery velocity and technical debt economics only.',
  'product-manager':
    'ROLE RESTRICTION: You are a Product Manager agent. You MUST NOT use Write or Edit tools. Bash is permitted ONLY for read-only queries. Review user value, usability, and product viability only.',
  'design-hci':
    'ROLE RESTRICTION: You are a Design/HCI agent. You MUST NOT use Write or Edit tools. Bash is permitted ONLY for read-only queries. Review cognitive load, API ergonomics, and UX heuristics only.',
  adjudicator:
    'ROLE RESTRICTION: You are an Adjudicator agent. You MUST NOT use Write or Edit tools. Bash is permitted ONLY for read-only queries. You are a single read-only agent providing a consolidated committee verdict.',
};

export const PLANNING_GUIDANCE = [
  '[FCA-AI Development Workflow]',
  'When designing a plan, include INTENT.md/DETAIL.md update steps:',
  '1. Identify affected fractal modules (directories with INTENT.md)',
  '2. Plan DETAIL.md updates for requirements/API changes BEFORE code',
  '3. Plan INTENT.md updates if boundaries or conventions change',
  '4. New modules need INTENT.md (max 50 lines, 3-tier) + DETAIL.md',
].join('\n');

export const IMPLEMENTATION_REMINDER = [
  '[FCA-AI Pre-Implementation Check]',
  'Before writing code, verify INTENT.md/DETAIL.md are updated for planned changes.',
  'DETAIL.md first (requirements), then INTENT.md if boundaries change.',
].join('\n');

export const PLANNING_AGENT_RE =
  /^oh-my-claudecode:(planner|architect|analyst|critic)$/;
export const EXECUTOR_AGENT_RE = /^oh-my-claudecode:(executor|deep-executor)$/;

export const GUIDE_BLOCK = [
  '[filid:filid-guide]',
  '[filid:ctx] — module boundary rules for the current directory.',
  '  intent: INTENT.md path. --- ... --- is its inline content. Obey these rules.',
  '  chain: parent INTENT.md paths (nearest > root). Each is a readable file — read to learn parent rules.',
  '  detail: DETAIL.md path. Read BEFORE writing code in this module.',
  '[filid:map] — visited directories this session. /* = current working directory. unread-intent: directories with INTENT.md not yet surfaced — read their INTENT.md before modifying.',
].join('\n');
