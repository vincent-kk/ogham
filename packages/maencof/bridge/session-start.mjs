#!/usr/bin/env node
import{existsSync as f,readFileSync as m,readdirSync as tt,writeFileSync as j}from"node:fs";import{join as nt}from"node:path";import{copyFileSync as G,existsSync as E,readFileSync as R,writeFileSync as D}from"node:fs";var h="<!-- MAENCOF:START -->",y="<!-- MAENCOF:END -->";function x(t,n,e={}){let{dryRun:r=!1,createIfMissing:a=!0}=e,i=[h,n.trim(),y].join(`
`);if(!E(t)){if(!a)return{changed:!1,hadExistingSection:!1,content:i};let l=i+`
`;return r||D(t,l,"utf-8"),{changed:!0,hadExistingSection:!1,content:l}}let o=R(t,"utf-8"),g=o.indexOf(h),s=o.indexOf(y),d,p;if(g!==-1&&s!==-1&&g<s){p=!0;let l=o.slice(0,g),B=o.slice(s+y.length);d=l+i+B}else{p=!1;let l=o.endsWith(`
`)?`
`:`

`;d=o+l+i+`
`}if(d===o)return{changed:!1,hadExistingSection:p,content:o};let _;return r||(_=t+".bak",G(t,_),D(t,d,"utf-8")),{changed:!0,hadExistingSection:p,backupPath:_,content:d}}function M(t){if(!E(t))return null;let n=R(t,"utf-8"),e=n.indexOf(h),r=n.indexOf(y);if(e===-1||r===-1||e>=r)return null;let a=e+h.length;return n.slice(a,r).trim()}import{appendFileSync as J,existsSync as W,mkdirSync as H,writeFileSync as K}from"node:fs";import{dirname as Y,join as k}from"node:path";var z="dailynotes";function X(t){return k(t,".maencof-meta",z)}function q(t,n){let e=n??C(new Date);return k(X(t),`${e}.md`)}function Q(t){let n=t.path?` \u2192 ${t.path}`:"";return`- **[${t.time}]** \`${t.category}\` ${t.description}${n}`}function O(t,n){let e=q(t),r=Y(e);H(r,{recursive:!0});let a=Q(n);if(W(e))J(e,a+`
`,"utf-8");else{let o=`# Dailynote \u2014 ${C(new Date)}

## Activity Log

`;K(e,o+a+`
`,"utf-8")}}function A(t){let n=String(t.getHours()).padStart(2,"0"),e=String(t.getMinutes()).padStart(2,"0");return`${n}:${e}`}function C(t){let n=t.getFullYear(),e=String(t.getMonth()+1).padStart(2,"0"),r=String(t.getDate()).padStart(2,"0");return`${n}-${e}-${r}`}function I(t){if(t===null||typeof t!="object")return!1;let n=t;return typeof n.schema_version=="number"&&n.schema_version>=1&&typeof n.name=="string"&&n.name.length>0&&typeof n.greeting=="string"&&n.greeting.length>0}var c="0.0.1";import{existsSync as b}from"node:fs";import{join as S}from"node:path";var $=".maencof-meta",Z=".maencof";function w(t){return b(S(t,Z))||b(S(t,$))}function u(t,...n){return S(t,$,...n)}function V(t){return S(t,"CLAUDE.md")}async function F(){let t=[];for await(let n of process.stdin)t.push(n);return Buffer.concat(t).toString("utf-8")}function P(t){process.stdout.write(JSON.stringify(t))}function T(t){let n=t.cwd??process.cwd(),e=[];if(!w(n))return{continue:!0,message:"[maencof] Vault is not initialized. Run `/maencof:setup` to get started."};let r=et(n);r&&e.push(`[maencof:${r.name}] ${r.greeting}`),rt(n,r?.name,e),it(n,e);let a=u(n,"wal.json");f(a)&&e.push("[maencof] Incomplete transaction (WAL) detected from a previous session. Run `/maencof:doctor` to diagnose.");let i=u(n,"schedule-log.json");if(f(i))try{let s=JSON.parse(m(i,"utf-8"));s.pending&&s.pending.length>0&&e.push(`[maencof] ${s.pending.length} pending task(s) found. Run \`/maencof:organize\` to process.`)}catch{}let o=u(n,"sessions");if(f(o)){let s=st(o);s&&e.push(`[maencof] Previous session summary:
${s}`)}let g=u(n,"data-sources.json");f(g)||e.push("[maencof] No external data sources connected. Run `/maencof:connect` to set up.");try{let s=t.session_id??"unknown";O(n,{time:A(new Date),category:"session",description:`\uC138\uC158 \uC2DC\uC791 (session_id: ${s})`})}catch{}return{continue:!0,message:e.length>0?e.join(`

`):void 0}}function et(t){let n=u(t,"companion-identity.json");if(!f(n))return null;try{let e=JSON.parse(m(n,"utf-8"));return I(e)?{name:e.name,greeting:e.greeting}:null}catch{return null}}function rt(t,n,e){try{let r=V(t),a=M(r),i=U(t);if(a===null){let o=N(t,n);x(r,o,{createIfMissing:!0}),L(t,c),e.push("[maencof] CLAUDE.md\uC5D0 maencof \uC9C0\uC2DC\uBB38\uC774 \uCD08\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4.")}else if(i===null)L(t,c);else if(i!==c){let o=N(t,n);x(r,o,{createIfMissing:!1}),ot(t,i),e.push(`[maencof] CLAUDE.md \uC9C0\uC2DC\uBB38\uC774 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4 (${i} \u2192 ${c}).`)}}catch{}}function U(t){let n=u(t,"version.json");if(!f(n))return null;try{return JSON.parse(m(n,"utf-8")).version??null}catch{return null}}function L(t,n){let e=u(t,"version.json"),r={version:n,installedAt:new Date().toISOString(),migrationHistory:[]};j(e,JSON.stringify(r,null,2),"utf-8")}function ot(t,n){let e=u(t,"version.json"),r;try{r=JSON.parse(m(e,"utf-8"))}catch{r={version:n,installedAt:new Date().toISOString(),migrationHistory:[]}}r.migrationHistory.push(`${n} -> ${c}`),r.version=c,r.lastMigratedAt=new Date().toISOString(),j(e,JSON.stringify(r,null,2),"utf-8")}function it(t,n){try{let e=U(t);e!==null&&e!==c&&n.push(`[maencof] \uD50C\uB7EC\uADF8\uC778\uC774 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4 (${e} \u2192 ${c}).
\`/maencof:setup\`\uC744 \uC2E4\uD589\uD558\uC5EC \uB9C8\uC774\uADF8\uB808\uC774\uC158\uC744 \uC644\uB8CC\uD558\uC138\uC694.`)}catch{}}function N(t,n){return`${n?`# maencof Knowledge Space (${n})`:"# maencof Knowledge Space"}

## Vault
- \uACBD\uB85C: ${t}
- \uBAA8\uB378: 5-Layer (Core/Derived/External/Action/Context)

## \uD544\uC218 \uADDC\uCE59 (MUST)

- vault \uB0B4 \uBB38\uC11C\uB97C \uAC80\uC0C9\uD560 \uB54C MUST use \`kg_search\` or \`kg_navigate\`. Grep, Read\uB85C vault \uD30C\uC77C\uC744 \uC9C1\uC811 \uAC80\uC0C9\uD558\uC9C0 \uB9C8\uC138\uC694.
- vault \uB0B4 \uBB38\uC11C\uB97C \uC77D\uC744 \uB54C MUST use \`maencof_read\`. Read \uB3C4\uAD6C\uB85C vault \uB9C8\uD06C\uB2E4\uC6B4 \uD30C\uC77C\uC744 \uC9C1\uC811 \uC77D\uC9C0 \uB9C8\uC138\uC694.
- vault\uC5D0 \uC0C8 \uC9C0\uC2DD\uC744 \uAE30\uB85D\uD560 \uB54C MUST use \`maencof_create\`. Write \uB3C4\uAD6C\uB85C vault\uC5D0 \uC9C1\uC811 \uD30C\uC77C\uC744 \uC0DD\uC131\uD558\uC9C0 \uB9C8\uC138\uC694.
- vault \uBB38\uC11C\uB97C \uC218\uC815\uD560 \uB54C MUST use \`maencof_update\`. Edit \uB3C4\uAD6C\uB85C vault \uB9C8\uD06C\uB2E4\uC6B4 \uD30C\uC77C\uC744 \uC9C1\uC811 \uC218\uC815\uD558\uC9C0 \uB9C8\uC138\uC694.
- \uC0C8 \uC815\uBCF4\uB97C \uD559\uC2B5\uD558\uBA74 MUST use \`kg_suggest_links\`\uB85C \uAE30\uC874 \uC9C0\uC2DD\uACFC\uC758 \uC5F0\uACB0 \uAC00\uB2A5\uC131\uC744 \uD655\uC778\uD558\uC138\uC694.
- \uBB38\uC11C \uC0DD\uC131 \uC2DC MUST specify layer\uC640 tags.

## \uAE08\uC9C0 \uADDC\uCE59 (FORBIDDEN)

- FORBIDDEN: vault \uACBD\uB85C \uB0B4 \uB9C8\uD06C\uB2E4\uC6B4 \uD30C\uC77C\uC5D0 \uB300\uD574 Read, Write, Edit, Grep, Glob \uB3C4\uAD6C\uB97C \uC9C1\uC811 \uC0AC\uC6A9\uD558\uB294 \uAC83
- FORBIDDEN: L1_Core \uBB38\uC11C\uB97C \uC9C1\uC811 \uC218\uC815\uD558\uB294 \uAC83 (identity-guardian \uC5D0\uC774\uC804\uD2B8\uB97C \uD1B5\uD574\uC57C \uD568)
- FORBIDDEN: .maencof/ \uB610\uB294 .maencof-meta/ \uB514\uB809\uD1A0\uB9AC\uB97C \uC9C1\uC811 \uC218\uC815\uD558\uB294 \uAC83

## \uB3C4\uAD6C \uB9E4\uD551

| \uD558\uACE0 \uC2F6\uC740 \uC77C | \uC0AC\uC6A9\uD560 \uB3C4\uAD6C | \uC0AC\uC6A9\uD558\uC9C0 \uB9D0 \uAC83 |
|---|---|---|
| vault \uBB38\uC11C \uAC80\uC0C9 | kg_search, kg_navigate | Grep, Glob |
| vault \uBB38\uC11C \uC77D\uAE30 | maencof_read | Read |
| vault \uBB38\uC11C \uC0DD\uC131 | maencof_create | Write |
| vault \uBB38\uC11C \uC218\uC815 | maencof_update | Edit |
| vault \uBB38\uC11C \uC0AD\uC81C | maencof_delete | Bash rm |
| vault \uBB38\uC11C \uC774\uB3D9 | maencof_move | Bash mv |
| vault \uC0C1\uD0DC \uD655\uC778 | kg_status | ls, find |
| \uB9E5\uB77D \uC870\uD569 | kg_context | \uC218\uB3D9 \uD30C\uC77C \uC870\uD569 |
| CLAUDE.md \uC218\uC815 | claudemd_merge | Edit (MAENCOF \uC601\uC5ED) |

## \uC2A4\uD0AC

| \uC2A4\uD0AC | \uC6A9\uB3C4 |
|---|---|
| /maencof:remember | \uC0C8 \uC9C0\uC2DD \uAE30\uB85D |
| /maencof:recall | \uACFC\uAC70 \uC9C0\uC2DD \uAC80\uC0C9 |
| /maencof:explore | \uC9C0\uC2DD \uADF8\uB798\uD504 \uD0D0\uC0C9 |
| /maencof:organize | \uC9C0\uC2DD \uC815\uB9AC/\uB9AC\uBDF0 |
| /maencof:reflect | \uC9C0\uC2DD \uD68C\uACE0 |`}function st(t){try{let n=tt(t).filter(i=>i.endsWith(".md")).sort().reverse();if(n.length===0)return null;let e=nt(t,n[0]);return m(e,"utf-8").split(`
`).slice(0,10).join(`
`).trim()||null}catch{return null}}var at=await F(),v;try{let t=JSON.parse(at);v=T(t)}catch{v={continue:!0}}P(v);
