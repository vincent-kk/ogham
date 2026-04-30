#!/usr/bin/env node
import{existsSync as E,readFileSync as _,readdirSync as mt,writeFileSync as ke}from"node:fs";import{join as pt}from"node:path";function b(e,t){return`${t?`# maencof Knowledge Space (${t})`:"# maencof Knowledge Space"}

## Vault
- Path: ${e}
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
- When the user says "\uAE30\uC5B5\uD574\uC918", "\uAE30\uC5B5\uD574", "remember this", "save this", "\uAE30\uB85D\uD574", "\uBA54\uBAA8\uD574" or similar memory requests, ALWAYS route to \`/maencof:maencof-remember\` skill or \`create\` tool.
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
Do NOT ask for confirmation \u2014 capture proactively. The user can review later via \`/maencof:maencof-insight --recent\`.
After capture, display: \u{1F4A1} Insight recorded to L{layer}: "{title}"
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
- Do NOT auto-create concept documents \u2014 always suggest and wait for user confirmation.

## Status Documents (Layer 4)

- Create \`04_Action/\` status documents for: ongoing research, active decisions, session context
- Set \`expires\` to 7 days for volatile context, 30 days for project status
- The system tracks document freshness automatically via the knowledge graph`}import{copyFileSync as be,existsSync as $,readFileSync as J,writeFileSync as G}from"node:fs";var D="<!-- MAENCOF:START -->",v="<!-- MAENCOF:END -->";function L(e,t,n={}){let{dryRun:i=!1,createIfMissing:r=!0}=n,s=[D,t.trim(),v].join(`
`);if(!$(e)){if(!r)return{changed:!1,hadExistingSection:!1,content:s};let S=s+`
`;return i||G(e,S,"utf-8"),{changed:!0,hadExistingSection:!1,content:S}}let a=J(e,"utf-8"),f=a.indexOf(D),h=a.indexOf(v),o,c;if(f!==-1&&h!==-1&&f<h){c=!0;let S=a.slice(0,f),R=a.slice(h+v.length);o=S+s+R}else{c=!1;let S=a.endsWith(`
`)?`
`:`

`;o=a+S+s+`
`}if(o===a)return{changed:!1,hadExistingSection:c,content:a};let y;return i||(y=e+".bak",be(e,y),G(e,o,"utf-8")),{changed:!0,hadExistingSection:c,backupPath:y,content:o}}function Y(e){if(!$(e))return null;let t=J(e,"utf-8"),n=t.indexOf(D),i=t.indexOf(v);if(n===-1||i===-1||n>=i)return null;let r=n+D.length;return t.slice(r,i).trim()}import{appendFileSync as Le,existsSync as we,mkdirSync as Ne,writeFileSync as Te}from"node:fs";import{dirname as Me,join as B}from"node:path";var H=".maencof",m=".maencof-meta",W="dailynotes";function Fe(e){return B(e,".maencof-meta",W)}function je(e,t){let n=t??X(new Date);return B(Fe(e),`${n}.md`)}function Pe(e){let t=e.path?` \u2192 ${e.path}`:"";return`- **[${e.time}]** \`${e.category}\` ${e.description}${t}`}function K(e,t){let n=je(e),i=Me(n);Ne(i,{recursive:!0});let r=Pe(t);if(we(n))Le(n,r+`
`,"utf-8");else{let a=`# Dailynote \u2014 ${X(new Date)}

## Activity Log

`;Te(n,a+r+`
`,"utf-8")}}function z(e){let t=String(e.getHours()).padStart(2,"0"),n=String(e.getMinutes()).padStart(2,"0");return`${t}:${n}`}function X(e){let t=e.getFullYear(),n=String(e.getMonth()+1).padStart(2,"0"),i=String(e.getDate()).padStart(2,"0");return`${t}-${n}-${i}`}import{existsSync as Ge,mkdirSync as Vt,readFileSync as $e,writeFileSync as Ut}from"node:fs";import{dirname as $t,join as Je}from"node:path";var d={schema_version:1,injection:{enabled:!0,budget_chars:2e3},session_recap:{enabled:!0}},q="MAENCOF_DISABLE_DIALOGUE",Q="dialogue-config.json";function w(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function Z(e,t){return typeof e=="boolean"?e:t}function ee(e,t){return typeof e=="number"&&Number.isInteger(e)&&e>=0?e:t}function Ve(e){let t=d.injection;if(e===null||typeof e!="object"||Array.isArray(e))return{...t};let n=e;return{enabled:Z(n.enabled,t.enabled),budget_chars:ee(n.budget_chars,t.budget_chars)}}function Ue(e){let t=d.session_recap;return e===null||typeof e!="object"||Array.isArray(e)?{...t}:{enabled:Z(e.enabled,t.enabled)}}function te(e){if(!w(e))return{...d,injection:{...d.injection},session_recap:{...d.session_recap}};let t=e;return{schema_version:ee(t.schema_version,d.schema_version),injection:Ve(t.injection),session_recap:Ue(t.session_recap)}}function Ye(e){return Je(e,m,Q)}function He(e){let t=Ye(e);if(!Ge(t))return d;try{let n=JSON.parse($e(t,"utf-8"));return w(n)?te(n):d}catch{return d}}function ne(e,t=process.env){return t[q]==="1"?!0:He(e).injection.enabled===!1}import{existsSync as oe,mkdirSync as Be,readFileSync as Ke,writeFileSync as ze}from"node:fs";import{dirname as Xe,join as qe}from"node:path";var ie="error-log.json";function re(e){return qe(e,m,ie)}function Qe(e){let t=Xe(e);oe(t)||Be(t,{recursive:!0})}function Ze(e){let t=re(e);if(!oe(t))return[];try{return JSON.parse(Ke(t,"utf-8"))}catch{return[]}}function et(e,t){let n=Ze(e);for(n.push(t);n.length>200;)n.shift();let i=re(e);Qe(i),ze(i,JSON.stringify(n),"utf-8")}function u(e,t){try{et(e,t)}catch{}}import{existsSync as A,mkdirSync as on,readFileSync as F,unlinkSync as rt,writeFileSync as rn}from"node:fs";import{dirname as an,join as st}from"node:path";var l={enabled:!0,sensitivity:"medium",max_captures_per_session:10,notify:!0,category_filter:{principle:!0,refuted_premise:!1,ephemeral_candidate:!1}},C={total_captured:0,l2_direct:0,l5_captured:0,l5_promoted:0,l5_archived:0,updatedAt:new Date().toISOString()},N="pending-insight-notification.json",T={high:"all opinions, experiences, discoveries, questions, conclusions, analogies, judgments. When in doubt, capture.",medium:"conclusions, deep experiences, significant discoveries, explicit judgments. Skip: simple opinions, incomplete questions, casual remarks.",low:"only verified experience+conclusion pairs, established principles, major discoveries. Skip most."};var tt=["high","medium","low"];function M(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function x(e,t){return typeof e=="boolean"?e:t}function nt(e){return tt.includes(e)?e:l.sensitivity}function it(e){return typeof e=="number"&&Number.isInteger(e)&&e>=0?e:l.max_captures_per_session}function ot(e){let t=l.category_filter;if(e===null||typeof e!="object"||Array.isArray(e))return{...t};let n=e;return{principle:x(n.principle,t.principle),refuted_premise:x(n.refuted_premise,t.refuted_premise),ephemeral_candidate:x(n.ephemeral_candidate,t.ephemeral_candidate)}}function se(e){if(!M(e))return{...l};let t=e;return{enabled:x(t.enabled,l.enabled),sensitivity:nt(t.sensitivity),max_captures_per_session:it(t.max_captures_per_session),notify:x(t.notify,l.notify),category_filter:ot(t.category_filter)}}function k(e,...t){return st(e,m,...t)}function j(e){let t=k(e,"insight-config.json");if(!A(t))return l;try{let n=JSON.parse(F(t,"utf-8"));return M(n)?se(n):l}catch{return l}}function at(e){let t=k(e,"auto-insight-stats.json");if(!A(t))return{...C};try{return JSON.parse(F(t,"utf-8"))}catch{return{...C}}}function ae(e){let t=k(e,N);if(!A(t))return null;try{return JSON.parse(F(t,"utf-8"))}catch{return null}}function ce(e){let t=k(e,N);if(A(t))try{rt(t)}catch{}}function ct(e){let t=e.l5_promoted+e.l5_archived;return t===0?null:e.l5_promoted/t}function ue(e){let t=at(e),n=ct(t);if(n===null)return{adjusted:!1,message:null};let i=j(e),r=null;return n<.3&&i.sensitivity!=="low"?r=i.sensitivity==="high"?"medium":"low":n>.8&&i.sensitivity!=="high"&&(r=i.sensitivity==="low"?"medium":"high"),r===null?{adjusted:!1,message:null}:{adjusted:!1,message:`Insight precision is ${(n*100).toFixed(0)}%. Sensitivity adjustment recommended: ${i.sensitivity} \u2192 ${r}`}}function le(e){let t=T[e.sensitivity]??T.medium;return`<auto-insight enabled="${e.enabled}" sensitivity="${e.sensitivity}" max="${e.max_captures_per_session}">
Detect user insights. Call capture_insight on detection. No confirmation.
Notify: \u{1F4A1} Insight recorded to L{layer}: "{title}"

${e.sensitivity}: ${t}

L2=validated conclusions/principles L5=impressions/questions/exploratory
Ignore: tool requests, file ops, builds, acks, greetings, slash commands.
</auto-insight>`}var fn={1:"01_Core",2:"02_Derived",3:"03_External",4:"04_Action",5:"05_Context"};var P="2.0.0";function ge(e){if(e===null||typeof e!="object")return!1;let t=e;return typeof t.schema_version=="number"&&t.schema_version>=1&&typeof t.name=="string"&&t.name.length>0&&typeof t.greeting=="string"&&t.greeting.length>0}var p="0.3.8";import{existsSync as De,mkdirSync as ut,readFileSync as lt,writeFileSync as ve}from"node:fs";var fe={enabled:!1},de={version:1,actions:[]},me=()=>({sources:[],updatedAt:new Date().toISOString()}),pe={};var he=[{filename:"insight-config.json",schemaVersion:1,defaultValue:()=>({...l,_schemaVersion:1})},{filename:"auto-insight-stats.json",schemaVersion:1,defaultValue:()=>({...C,updatedAt:new Date().toISOString(),_schemaVersion:1})},{filename:"vault-commit.json",schemaVersion:1,defaultValue:()=>({...fe,_schemaVersion:1})},{filename:"lifecycle.json",schemaVersion:1,defaultValue:()=>({...de,actions:[],_schemaVersion:1})},{filename:"data-sources.json",schemaVersion:1,defaultValue:()=>({...me(),_schemaVersion:1})},{filename:"usage-stats.json",defaultValue:()=>({...pe})}];import{existsSync as ye}from"node:fs";import{join as O}from"node:path";function Se(e){return ye(O(e,H))||ye(O(e,m))}function g(e,...t){return O(e,m,...t)}function _e(e){return O(e,"CLAUDE.md")}async function Ie(){let e=[];for await(let t of process.stdin)e.push(t);return Buffer.concat(e).toString("utf-8")}function Ee(e){process.stdout.write(JSON.stringify(e))}function gt(e,t){let n={...e};for(let[i,r]of Object.entries(t))i in n||(n[i]=r);return n._schemaVersion=t._schemaVersion,n}function Ce(e){let t={created:[],skipped:[],migrated:[]},n=g(e);De(n)||ut(n,{recursive:!0});for(let i of he){let r=g(e,i.filename);if(De(r))if(i.schemaVersion!=null)try{let s=JSON.parse(lt(r,"utf-8"));if((s._schemaVersion??0)<i.schemaVersion){let f=i.defaultValue(),h=gt(s,f);ve(r,JSON.stringify(h),"utf-8"),t.migrated.push(i.filename)}else t.skipped.push(i.filename)}catch(s){u(e,{hook:"config-provisioner",error:String(s),timestamp:new Date().toISOString()}),t.skipped.push(i.filename)}else t.skipped.push(i.filename);else{let s=i.defaultValue();ve(r,JSON.stringify(s),"utf-8"),t.created.push(i.filename)}}return t}var xe=`# Using maencof \u2014 Dialogue Discipline

Observe every session. CLAUDE.md / AGENTS.md user instructions override this meta-skill.

## 1. Instruction Priority

1. CLAUDE.md / AGENTS.md user instructions
2. maencof dialogue discipline (this meta-skill)
3. Default system prompt

## 2. 6 Role \u2192 Skill Mapping

| Role | Skill |
|---|---|
| Brainstorming / ideation | \`maencof-explore --for-brainstorm\` \u2192 \`maencof-think --mode divergent\` |
| Insight capture management | \`maencof-insight\` + \`capture_insight\` MCP tool |
| Spec refinement | \`maencof-refine\` (Phase 2.5 Socratic included) |
| Interview convergence | \`maencof-refine\` Phase 2.5 |
| Plan review | \`maencof-think --mode review\` |
| Session retrospective | SessionEnd hook automatic recap (no explicit invocation) |

## 3. Flow & Priority

1. Vague / ambiguous input \u2192 \`maencof-refine\` first. If alternatives still remain, then \`maencof-think --mode default\`.
2. Ideation signals ("idea", "stuck", "brainstorm") \u2192 \`maencof-explore --for-brainstorm\` (seed first) \u2192 \`maencof-think --mode divergent\`. Never invoke \`think\` without a sufficient seed \u2014 run \`explore\` beforehand.
3. Plan / spec path ref + "review" / "check" \u2192 \`maencof-think --mode review\`.
4. Session termination \u2192 SessionEnd recap surfaces automatically. Persist only when the user explicitly requests it. \`reflect\` is reserved for the vault judge, not session recap.
5. Auto-insight capture runs via \`capture_insight\` MCP + \`insight-injector\` hook; direct invocation not required.

## 4. Red Flags

| Rationalization | Correction |
|---|---|
| "Too simple, skill not needed" | Simple tasks carry the greatest risk \u2014 apply discipline |
| "Just implement directly" | Route through refine; confirm scope first |
| "Ask everything at once" | One question at a time (refine Prime Directive 2) |
| "Save ToT candidates" | Ephemeral \u2014 do NOT persist (explicit approval only) |
| "User said 'proceed' so OK" | Verify Phase 2.5 convergence criteria |
| "I already know this" | Re-invoke \u2014 observe rather than rely on memory |

## 5. Persistence Rules

- **Ephemeral (do NOT persist)**: refine Phase 1/2 output, think intermediate candidates, explore raw results.
- **Durable (explicit approval required)**: refine Phase 4 output, think selected interpretation, review risks.
- **Principle (\`capture_insight\`)**: refine Phase 2.5 premises, think Lookahead predictions \u2192 \`capture_insight(category=principle)\`.
- **Insight category filter defaults**: \`principle\` accept \xB7 \`refuted_premise\` reject \xB7 \`ephemeral_candidate\` reject.
`;var V="maencof-meta-skill";function Oe(e){let t=e.cwd??process.cwd(),n=[];if(!Se(t))return{continue:!0,hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:"[maencof] Vault is not initialized. Run `/maencof:maencof-setup` to get started."}};let i=St(t);i&&n.push(`[maencof:${i.name}] ${i.greeting}`),_t(t,i?.name,n);try{let o=Ce(t);o.created.length>0&&n.push(`[maencof] Config files provisioned: ${o.created.join(", ")}`),o.migrated.length>0&&n.push(`[maencof] Config schemas updated: ${o.migrated.join(", ")}`)}catch(o){u(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}Et(t,n),Dt(t,n);let r=g(t,"wal.json");E(r)&&n.push("[maencof] Incomplete transaction (WAL) detected from a previous session. Run `/maencof:maencof-checkup` to diagnose.");let s=g(t,"schedule-log.json");if(E(s))try{let o=JSON.parse(_(s,"utf-8"));o.pending&&o.pending.length>0&&n.push(`[maencof] ${o.pending.length} pending task(s) found. Run \`/maencof:maencof-organize\` to process.`)}catch(o){u(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}let a=g(t,"sessions");if(E(a)){let o=vt(a);o&&n.push(`[maencof] Previous session summary:
${o}`)}let f=g(t,"data-sources.json");try{let o=_(f,"utf-8"),c=JSON.parse(o);(!c.sources||c.sources.length===0)&&n.push("[maencof] No external data sources connected. Run `/maencof:maencof-connect` to set up.")}catch(o){u(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()}),n.push("[maencof] No external data sources connected. Run `/maencof:maencof-connect` to set up.")}try{let o=ue(t);o.message&&n.push(`[maencof] ${o.message}`)}catch(o){u(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}try{let o=j(t);o.enabled&&n.push(le(o));let c=ae(t);if(c&&c.captures.length>0){let y=c.captures.filter(I=>I.layer===2).length,S=c.captures.filter(I=>I.layer===5).length,R=c.captures.map(I=>`  - L${I.layer}: "${I.title}"`).join(`
`);n.push(`\u{1F4A1} \uC9C0\uB09C \uC138\uC158\uC5D0\uC11C ${c.captures.length}\uAC1C \uC778\uC0AC\uC774\uD2B8\uB97C \uC790\uB3D9 \uCEA1\uCC98\uD588\uC2B5\uB2C8\uB2E4 (L2: ${y}, L5: ${S}):
${R}
/maencof:maencof-insight --recent \uB85C \uD655\uC778\uD558\uC138\uC694.`),ce(t)}}catch(o){u(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}try{let o=e.session_id??"unknown";K(t,{time:z(new Date),category:"session",description:`Session started (session_id: ${o})`})}catch(o){u(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}let h={continue:!0};try{let o=yt(t),c=n.length>0?n.join(`

`):null,y=ht(o,c);y!==null&&(h.hookSpecificOutput={hookEventName:"SessionStart",additionalContext:y})}catch(o){u(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}return h}function ht(e,t){return e&&t?`${e}

${t}`:e??t}function yt(e){if(ne(e))return null;let t=xe;return[...t].length>2500?null:`<${V}>
${t}
</${V}>`}function St(e){let t=g(e,"companion-identity.json");if(!E(t))return null;try{let n=JSON.parse(_(t,"utf-8"));return ge(n)?{name:n.name,greeting:n.greeting}:null}catch(n){return u(e,{hook:"session-start",error:String(n),timestamp:new Date().toISOString()}),null}}function _t(e,t,n){let i=!1;try{let r=_e(e),s=Y(r),a=Re(e);if(s===null){let f=b(e,t);L(r,f,{createIfMissing:!0}),Ae(e,p),n.push("[maencof] maencof directives initialized in CLAUDE.md."),i=!0}else if(a===null)Ae(e,p),i=!0;else if(a!==p){let f=b(e,t);L(r,f,{createIfMissing:!1}),It(e,a),n.push(`[maencof] CLAUDE.md directives updated (${a} \u2192 ${p}).`),i=!0}}catch(r){u(e,{hook:"session-start",error:String(r),timestamp:new Date().toISOString()})}return i}function Re(e){let t=g(e,"version.json");if(!E(t))return null;try{return JSON.parse(_(t,"utf-8")).version??null}catch(n){return u(e,{hook:"session-start",error:String(n),timestamp:new Date().toISOString()}),null}}function Ae(e,t){let n=g(e,"version.json"),i={version:t,installedAt:new Date().toISOString(),migrationHistory:[]};ke(n,JSON.stringify(i),"utf-8")}function It(e,t){let n=g(e,"version.json"),i;try{i=JSON.parse(_(n,"utf-8"))}catch(r){u(e,{hook:"session-start",error:String(r),timestamp:new Date().toISOString()}),i={version:t,installedAt:new Date().toISOString(),migrationHistory:[]}}i.migrationHistory.push(`${t} -> ${p}`),i.version=p,i.lastMigratedAt=new Date().toISOString(),ke(n,JSON.stringify(i),"utf-8")}function Et(e,t){try{let n=g(e,"version.json"),i="1.0.0";E(n)&&(i=JSON.parse(_(n,"utf-8")).architecture_version??"1.0.0"),i!==P&&t.push(`[maencof] Architecture update available (${i} \u2192 ${P}).
L3 sub-layers (relational/structural/topical) and L5 sub-layers (buffer/boundary) are now supported.
Run \`/maencof:maencof-migrate\` to upgrade your vault structure.`)}catch(n){u(e,{hook:"session-start",error:String(n),timestamp:new Date().toISOString()})}}function Dt(e,t){try{let n=Re(e);n!==null&&n!==p&&t.push(`[maencof] Plugin updated (${n} \u2192 ${p}).
Run \`/maencof:maencof-setup\` to complete the migration.`)}catch(n){u(e,{hook:"session-start",error:String(n),timestamp:new Date().toISOString()})}}function vt(e){try{let t=mt(e).filter(s=>s.endsWith(".md")).sort().reverse();if(t.length===0)return null;let n=pt(e,t[0]);return _(n,"utf-8").split(`
`).slice(0,10).join(`
`).trim()||null}catch{return null}}var Ct=await Ie(),U;try{let e=JSON.parse(Ct);U=Oe(e)}catch{U={continue:!0}}Ee(U);
