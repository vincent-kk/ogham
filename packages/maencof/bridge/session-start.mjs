#!/usr/bin/env node
import{existsSync as f,readFileSync as m,readdirSync as U,writeFileSync as F}from"node:fs";import{join as B}from"node:path";import{copyFileSync as L,existsSync as M,readFileSync as _,writeFileSync as I}from"node:fs";var h="<!-- MAENCOF:START -->",S="<!-- MAENCOF:END -->";function x(n,t,e={}){let{dryRun:o=!1,createIfMissing:u=!0}=e,i=[h,t.trim(),S].join(`
`);if(!M(n)){if(!u)return{changed:!1,hadExistingSection:!1,content:i};let l=i+`
`;return o||I(n,l,"utf-8"),{changed:!0,hadExistingSection:!1,content:l}}let r=_(n,"utf-8"),d=r.indexOf(h),s=r.indexOf(S),g,p;if(d!==-1&&s!==-1&&d<s){p=!0;let l=r.slice(0,d),$=r.slice(s+S.length);g=l+i+$}else{p=!1;let l=r.endsWith(`
`)?`
`:`

`;g=r+l+i+`
`}if(g===r)return{changed:!1,hadExistingSection:p,content:r};let v;return o||(v=n+".bak",L(n,v),I(n,g,"utf-8")),{changed:!0,hadExistingSection:p,backupPath:v,content:g}}function E(n){if(!M(n))return null;let t=_(n,"utf-8"),e=t.indexOf(h),o=t.indexOf(S);if(e===-1||o===-1||e>=o)return null;let u=e+h.length;return t.slice(u,o).trim()}function O(n){if(n===null||typeof n!="object")return!1;let t=n;return typeof t.schema_version=="number"&&t.schema_version>=1&&typeof t.name=="string"&&t.name.length>0&&typeof t.greeting=="string"&&t.greeting.length>0}var a="0.0.1";import{existsSync as b}from"node:fs";import{join as y}from"node:path";var C=".maencof-meta",T=".maencof";function V(n){return b(y(n,T))||b(y(n,C))}function c(n,...t){return y(n,C,...t)}function k(n){return y(n,"CLAUDE.md")}async function A(){let n=[];for await(let t of process.stdin)n.push(t);return Buffer.concat(n).toString("utf-8")}function N(n){process.stdout.write(JSON.stringify(n))}function P(n){let t=n.cwd??process.cwd(),e=[];if(!V(t))return{continue:!0,message:"[maencof] Vault is not initialized. Run `/maencof:setup` to get started."};let o=J(t);o&&e.push(`[maencof:${o.name}] ${o.greeting}`),W(t,o?.name,e),z(t,e);let u=c(t,"wal.json");f(u)&&e.push("[maencof] Incomplete transaction (WAL) detected from a previous session. Run `/maencof:doctor` to diagnose.");let i=c(t,"schedule-log.json");if(f(i))try{let s=JSON.parse(m(i,"utf-8"));s.pending&&s.pending.length>0&&e.push(`[maencof] ${s.pending.length} pending task(s) found. Run \`/maencof:organize\` to process.`)}catch{}let r=c(t,"sessions");if(f(r)){let s=K(r);s&&e.push(`[maencof] Previous session summary:
${s}`)}let d=c(t,"data-sources.json");return f(d)||e.push("[maencof] No external data sources connected. Run `/maencof:connect` to set up."),{continue:!0,message:e.length>0?e.join(`

`):void 0}}function J(n){let t=c(n,"companion-identity.json");if(!f(t))return null;try{let e=JSON.parse(m(t,"utf-8"));return O(e)?{name:e.name,greeting:e.greeting}:null}catch{return null}}function W(n,t,e){try{let o=k(n),u=E(o),i=j(n);if(u===null){let r=D(n,t);x(o,r,{createIfMissing:!0}),w(n,a),e.push("[maencof] CLAUDE.md\uC5D0 maencof \uC9C0\uC2DC\uBB38\uC774 \uCD08\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4.")}else if(i===null)w(n,a);else if(i!==a){let r=D(n,t);x(o,r,{createIfMissing:!1}),G(n,i),e.push(`[maencof] CLAUDE.md \uC9C0\uC2DC\uBB38\uC774 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4 (${i} \u2192 ${a}).`)}}catch{}}function j(n){let t=c(n,"version.json");if(!f(t))return null;try{return JSON.parse(m(t,"utf-8")).version??null}catch{return null}}function w(n,t){let e=c(n,"version.json"),o={version:t,installedAt:new Date().toISOString(),migrationHistory:[]};F(e,JSON.stringify(o,null,2),"utf-8")}function G(n,t){let e=c(n,"version.json"),o;try{o=JSON.parse(m(e,"utf-8"))}catch{o={version:t,installedAt:new Date().toISOString(),migrationHistory:[]}}o.migrationHistory.push(`${t} -> ${a}`),o.version=a,o.lastMigratedAt=new Date().toISOString(),F(e,JSON.stringify(o,null,2),"utf-8")}function z(n,t){try{let e=j(n);e!==null&&e!==a&&t.push(`[maencof] \uD50C\uB7EC\uADF8\uC778\uC774 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4 (${e} \u2192 ${a}).
\`/maencof:setup\`\uC744 \uC2E4\uD589\uD558\uC5EC \uB9C8\uC774\uADF8\uB808\uC774\uC158\uC744 \uC644\uB8CC\uD558\uC138\uC694.`)}catch{}}function D(n,t){return`${t?`# maencof Knowledge Space (${t})`:"# maencof Knowledge Space"}

## Vault
- \uACBD\uB85C: ${n}
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
| /maencof:reflect | \uC9C0\uC2DD \uD68C\uACE0 |`}function K(n){try{let t=U(n).filter(i=>i.endsWith(".md")).sort().reverse();if(t.length===0)return null;let e=B(n,t[0]);return m(e,"utf-8").split(`
`).slice(0,10).join(`
`).trim()||null}catch{return null}}var H=await A(),R;try{let n=JSON.parse(H);R=P(n)}catch{R={continue:!0}}N(R);
