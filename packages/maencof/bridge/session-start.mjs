#!/usr/bin/env node
import{existsSync as d,readFileSync as f,readdirSync as ee,writeFileSync as N}from"node:fs";import{join as te}from"node:path";import{copyFileSync as B,existsSync as k,readFileSync as R,writeFileSync as D}from"node:fs";var h="<!-- MAENCOF:START -->",y="<!-- MAENCOF:END -->";function x(e,t,n={}){let{dryRun:o=!1,createIfMissing:a=!0}=n,i=[h,t.trim(),y].join(`
`);if(!k(e)){if(!a)return{changed:!1,hadExistingSection:!1,content:i};let l=i+`
`;return o||D(e,l,"utf-8"),{changed:!0,hadExistingSection:!1,content:l}}let r=R(e,"utf-8"),g=r.indexOf(h),s=r.indexOf(y),m,p;if(g!==-1&&s!==-1&&g<s){p=!0;let l=r.slice(0,g),W=r.slice(s+y.length);m=l+i+W}else{p=!1;let l=r.endsWith(`
`)?`
`:`

`;m=r+l+i+`
`}if(m===r)return{changed:!1,hadExistingSection:p,content:r};let _;return o||(_=e+".bak",B(e,_),D(e,m,"utf-8")),{changed:!0,hadExistingSection:p,backupPath:_,content:m}}function w(e){if(!k(e))return null;let t=R(e,"utf-8"),n=t.indexOf(h),o=t.indexOf(y);if(n===-1||o===-1||n>=o)return null;let a=n+h.length;return t.slice(a,o).trim()}import{appendFileSync as G,existsSync as J,mkdirSync as z,writeFileSync as H}from"node:fs";import{dirname as K,join as E}from"node:path";var Y="dailynotes";function X(e){return E(e,".maencof-meta",Y)}function q(e,t){let n=t??A(new Date);return E(X(e),`${n}.md`)}function Q(e){let t=e.path?` \u2192 ${e.path}`:"";return`- **[${e.time}]** \`${e.category}\` ${e.description}${t}`}function M(e,t){let n=q(e),o=K(n);z(o,{recursive:!0});let a=Q(t);if(J(n))G(n,a+`
`,"utf-8");else{let r=`# Dailynote \u2014 ${A(new Date)}

## Activity Log

`;H(n,r+a+`
`,"utf-8")}}function b(e){let t=String(e.getHours()).padStart(2,"0"),n=String(e.getMinutes()).padStart(2,"0");return`${t}:${n}`}function A(e){let t=e.getFullYear(),n=String(e.getMonth()+1).padStart(2,"0"),o=String(e.getDate()).padStart(2,"0");return`${t}-${n}-${o}`}function O(e){if(e===null||typeof e!="object")return!1;let t=e;return typeof t.schema_version=="number"&&t.schema_version>=1&&typeof t.name=="string"&&t.name.length>0&&typeof t.greeting=="string"&&t.greeting.length>0}var c="0.0.4";import{existsSync as C}from"node:fs";import{join as S}from"node:path";var I=".maencof-meta",Z=".maencof";function $(e){return C(S(e,Z))||C(S(e,I))}function u(e,...t){return S(e,I,...t)}function T(e){return S(e,"CLAUDE.md")}async function P(){let e=[];for await(let t of process.stdin)e.push(t);return Buffer.concat(e).toString("utf-8")}function V(e){process.stdout.write(JSON.stringify(e))}function j(e){let t=e.cwd??process.cwd(),n=[];if(!$(t))return{continue:!0,message:"[maencof] Vault is not initialized. Run `/maencof:setup` to get started."};let o=ne(t);o&&n.push(`[maencof:${o.name}] ${o.greeting}`),oe(t,o?.name,n),ie(t,n);let a=u(t,"wal.json");d(a)&&n.push("[maencof] Incomplete transaction (WAL) detected from a previous session. Run `/maencof:doctor` to diagnose.");let i=u(t,"schedule-log.json");if(d(i))try{let s=JSON.parse(f(i,"utf-8"));s.pending&&s.pending.length>0&&n.push(`[maencof] ${s.pending.length} pending task(s) found. Run \`/maencof:organize\` to process.`)}catch{}let r=u(t,"sessions");if(d(r)){let s=se(r);s&&n.push(`[maencof] Previous session summary:
${s}`)}let g=u(t,"data-sources.json");d(g)||n.push("[maencof] No external data sources connected. Run `/maencof:connect` to set up.");try{let s=e.session_id??"unknown";M(t,{time:b(new Date),category:"session",description:`Session started (session_id: ${s})`})}catch{}return{continue:!0,message:n.length>0?n.join(`

`):void 0}}function ne(e){let t=u(e,"companion-identity.json");if(!d(t))return null;try{let n=JSON.parse(f(t,"utf-8"));return O(n)?{name:n.name,greeting:n.greeting}:null}catch{return null}}function oe(e,t,n){try{let o=T(e),a=w(o),i=U(e);if(a===null){let r=L(e,t);x(o,r,{createIfMissing:!0}),F(e,c),n.push("[maencof] maencof directives initialized in CLAUDE.md.")}else if(i===null)F(e,c);else if(i!==c){let r=L(e,t);x(o,r,{createIfMissing:!1}),re(e,i),n.push(`[maencof] CLAUDE.md directives updated (${i} \u2192 ${c}).`)}}catch{}}function U(e){let t=u(e,"version.json");if(!d(t))return null;try{return JSON.parse(f(t,"utf-8")).version??null}catch{return null}}function F(e,t){let n=u(e,"version.json"),o={version:t,installedAt:new Date().toISOString(),migrationHistory:[]};N(n,JSON.stringify(o,null,2),"utf-8")}function re(e,t){let n=u(e,"version.json"),o;try{o=JSON.parse(f(n,"utf-8"))}catch{o={version:t,installedAt:new Date().toISOString(),migrationHistory:[]}}o.migrationHistory.push(`${t} -> ${c}`),o.version=c,o.lastMigratedAt=new Date().toISOString(),N(n,JSON.stringify(o,null,2),"utf-8")}function ie(e,t){try{let n=U(e);n!==null&&n!==c&&t.push(`[maencof] Plugin updated (${n} \u2192 ${c}).
Run \`/maencof:setup\` to complete the migration.`)}catch{}}function L(e,t){return`${t?`# maencof Knowledge Space (${t})`:"# maencof Knowledge Space"}

## Vault
- Path: ${e}
- Model: 5-Layer (Core/Derived/External/Action/Context)

## Required Rules (MUST)

- When searching vault documents MUST use \`kg_search\` or \`kg_navigate\`. Do not search vault files directly with Grep or Read.
- When reading vault documents MUST use \`maencof_read\`. Do not read vault markdown files directly with the Read tool.
- When recording new knowledge to vault MUST use \`maencof_create\`. Do not create files directly in the vault with the Write tool.
- When modifying vault documents MUST use \`maencof_update\`. Do not edit vault markdown files directly with the Edit tool.
- When learning new information MUST use \`kg_suggest_links\` to check for connection possibilities with existing knowledge.
- When creating documents MUST specify layer and tags.

## Forbidden Rules (FORBIDDEN)

- FORBIDDEN: Directly using Read, Write, Edit, Grep, Glob tools on markdown files within the vault path
- FORBIDDEN: Directly modifying L1_Core documents (must go through the identity-guardian agent)
- FORBIDDEN: Directly modifying the .maencof/ or .maencof-meta/ directories

## Tool Mapping

| Action | Use | Do NOT Use |
|---|---|---|
| Search vault documents | kg_search, kg_navigate | Grep, Glob |
| Read vault documents | maencof_read | Read |
| Create vault documents | maencof_create | Write |
| Update vault documents | maencof_update | Edit |
| Delete vault documents | maencof_delete | Bash rm |
| Move vault documents | maencof_move | Bash mv |
| Check vault status | kg_status | ls, find |
| Assemble context | kg_context | Manual file assembly |
| Modify CLAUDE.md | claudemd_merge | Edit (MAENCOF section) |

## Skills

| Skill | Purpose |
|---|---|
| /maencof:remember | Record new knowledge |
| /maencof:recall | Search past knowledge |
| /maencof:explore | Explore knowledge graph |
| /maencof:organize | Organize/review knowledge |
| /maencof:reflect | Reflect on knowledge |

## Auto-Document Lifecycle (MUST)

- When learning new factual information during conversation, MUST create a vault document using \`maencof_create\` with appropriate layer and tags.
- When discovering that existing vault information is outdated, MUST update the document using \`maencof_update\`.
- For temporary task context (meeting notes, debugging sessions, research in progress), MUST create Layer 4 (Action) documents with appropriate \`expires\` dates.
- When conversation reveals connections between existing documents, MUST use \`kg_suggest_links\` and update documents to add \`[[wikilinks]]\`.
- When the system advises running \`kg_build\` (stale index advisory), follow the advice promptly.
- Run \`kg_build\` explicitly only when advised by the system (high stale ratio) or for full PageRank recalculation.

## Status Documents (Layer 4)

- Create \`04_Action/\` status documents for: ongoing research, active decisions, session context
- Set \`expires\` to 7 days for volatile context, 30 days for project status
- The system tracks document freshness automatically via the knowledge graph`}function se(e){try{let t=ee(e).filter(i=>i.endsWith(".md")).sort().reverse();if(t.length===0)return null;let n=te(e,t[0]);return f(n,"utf-8").split(`
`).slice(0,10).join(`
`).trim()||null}catch{return null}}var ae=await P(),v;try{let e=JSON.parse(ae);v=j(e)}catch{v={continue:!0}}V(v);
