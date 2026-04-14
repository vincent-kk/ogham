/**
 * @file directive-template.ts
 * @description Default maencof directive template for CLAUDE.md injection.
 */

/**
 * 기본 maencof 지시문 템플릿을 생성한다.
 */
export function buildDefaultDirective(
  cwd: string,
  companionName?: string,
): string {
  const header = companionName
    ? `# maencof Knowledge Space (${companionName})`
    : '# maencof Knowledge Space';

  return `${header}

## Vault
- Path: ${cwd}
- Model: 5-Layer (L1:Core / L2:Derived / L3:External[relational,structural,topical] / L4:Action / L5:Context[buffer,boundary])

## Required Rules (MUST)

- When searching vault documents MUST use \`kg_search\` or \`kg_navigate\`. Do not search vault files directly with Grep or Read.
- When reading vault documents MUST use \`read\`. Do not read vault markdown files directly with the Read tool.
- When recording new knowledge to vault MUST use \`create\`. Do not create files directly in the vault with the Write tool.
- When modifying vault documents MUST use \`update\`. Do not edit vault markdown files directly with the Edit tool.
- When learning new information MUST use \`kg_suggest_links\` to check for connection possibilities with existing knowledge.
- When creating documents MUST specify layer and tags.
- When creating documents about interactions with people (meetings, conversations, collaborations), MUST include \`mentioned_persons\` parameter in \`create\` with the names of people mentioned. This is separate from \`person_ref\` (L3A-only, identifies who a profile document is about). \`mentioned_persons\` captures anyone mentioned in any document at any layer.

## Forbidden Rules (FORBIDDEN)

- FORBIDDEN: Directly using Read, Write, Edit, Grep, Glob tools on markdown files within the vault path
- FORBIDDEN: Directly modifying L1_Core documents (must go through the identity-guardian agent)
- FORBIDDEN: Directly modifying the .maencof/ or .maencof-meta/ directories
- FORBIDDEN: Using Claude's built-in memory (<remember> tags / MEMORY.md) to store user knowledge or conversation insights

## Memory Routing (CRITICAL)

- NEVER use Claude's built-in auto-memory (<remember> tags or MEMORY.md) for knowledge the user asks to remember.
- When the user says "기억해줘", "기억해", "remember this", "save this", "기록해", "메모해" or similar memory requests, ALWAYS route to \`/maencof:maencof-remember\` skill or \`create\` tool.
- Claude's auto-memory is ONLY for Claude's own operational notes (tool preferences, workflow settings). All user knowledge MUST go to the maencof vault.

## Tool Mapping

| Action | Use | Do NOT Use |
|---|---|---|
| Search vault documents | kg_search, kg_navigate | Grep, Glob |
| Read vault documents | read | Read |
| Create vault documents | create | Write |
| Update vault documents | update | Edit |
| Delete vault documents | delete | Bash rm |
| Move vault documents | move | Bash mv |
| Check vault status | kg_status | ls, find |
| Assemble context | kg_context | Manual file assembly |
| Capture insight | capture_insight | create (use dedicated tool) |
| Modify CLAUDE.md | claudemd_merge | Edit (MAENCOF section) |

## Skills

| Skill | Purpose |
|---|---|
| /maencof:maencof-remember | Record new knowledge |
| /maencof:maencof-recall | Search past knowledge |
| /maencof:maencof-explore | Explore knowledge graph |
| /maencof:maencof-organize | Organize/review knowledge |
| /maencof:maencof-reflect | Reflect on knowledge |
| /maencof:maencof-insight | Manage auto-insight capture |

## Auto-Insight Capture

When auto-insight capture is enabled, monitor the conversation for user insights worth preserving.
When you detect a meaningful insight during conversation, call \`capture_insight\` to record it.
Do NOT ask for confirmation — capture proactively. The user can review later via \`/maencof:maencof-insight --recent\`.
After capture, display: 💡 Insight recorded to L{layer}: "{title}"
Capture criteria and sensitivity are provided via the session meta-prompt at session start.

## Auto-Document Lifecycle (MUST)

- When learning new factual information during conversation, MUST create a vault document using \`create\` with appropriate layer and tags.
- When discovering that existing vault information is outdated, MUST update the document using \`update\`.
- For temporary task context (meeting notes, debugging sessions, research in progress), MUST create Layer 4 (Action) documents with appropriate \`expires\` dates.
- When conversation reveals connections between existing documents, MUST use \`kg_suggest_links\` and update documents to add \`[[wikilinks]]\`.
- When the system advises running \`kg_build\` (stale index advisory), follow the advice promptly.
- Run \`kg_build\` explicitly only when advised by the system (high stale ratio) or for full PageRank recalculation.

## Concept Document Lifecycle

- After creating a document via \`create\`, check whether concept documents exist for each tag used.
- A concept document is a Layer 3C (topical) document that defines and explains a tag/concept (e.g., \`03_External/topical/distributed-systems.md\` for tag \`distributed-systems\`).
- If a tag has been used 3+ times across documents but has no concept document, suggest creating one:
  "Tag '{tag}' is used in {N} documents but has no concept document. Create one with \`/maencof:maencof-remember --layer 3 --sub-layer topical --title "{tag}" --tags {tag},concept\`?"
- Use \`kg_search\` with the tag as seed to check for existing concept documents before suggesting.
- Do NOT auto-create concept documents — always suggest and wait for user confirmation.

## Status Documents (Layer 4)

- Create \`04_Action/\` status documents for: ongoing research, active decisions, session context
- Set \`expires\` to 7 days for volatile context, 30 days for project status
- The system tracks document freshness automatically via the knowledge graph`;
}
