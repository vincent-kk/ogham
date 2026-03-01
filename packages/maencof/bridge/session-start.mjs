#!/usr/bin/env node
import{existsSync as d,readFileSync as x,readdirSync as L}from"node:fs";import{join as D}from"node:path";import{copyFileSync as j,existsSync as R,readFileSync as b,writeFileSync as _}from"node:fs";var p="<!-- MAENCOF:START -->",m="<!-- MAENCOF:END -->";function M(n,t,e={}){let{dryRun:o=!1,createIfMissing:a=!0}=e,r=[p,t.trim(),m].join(`
`);if(!R(n)){if(!a)return{changed:!1,hadExistingSection:!1,content:r};let c=r+`
`;return o||_(n,c,"utf-8"),{changed:!0,hadExistingSection:!1,content:c}}let i=b(n,"utf-8"),f=i.indexOf(p),s=i.indexOf(m),l,g;if(f!==-1&&s!==-1&&f<s){g=!0;let c=i.slice(0,f),F=i.slice(s+m.length);l=c+r+F}else{g=!1;let c=i.endsWith(`
`)?`
`:`

`;l=i+c+r+`
`}if(l===i)return{changed:!1,hadExistingSection:g,content:i};let S;return o||(S=n+".bak",j(n,S),_(n,l,"utf-8")),{changed:!0,hadExistingSection:g,backupPath:S,content:l}}function C(n){if(!R(n))return null;let t=b(n,"utf-8"),e=t.indexOf(p),o=t.indexOf(m);if(e===-1||o===-1||e>=o)return null;let a=e+p.length;return t.slice(a,o).trim()}function E(n){if(n===null||typeof n!="object")return!1;let t=n;return typeof t.schema_version=="number"&&t.schema_version>=1&&typeof t.name=="string"&&t.name.length>0&&typeof t.greeting=="string"&&t.greeting.length>0}import{existsSync as I}from"node:fs";import{join as h}from"node:path";var k=".maencof-meta",N=".maencof";function w(n){return I(h(n,N))||I(h(n,k))}function u(n,...t){return h(n,k,...t)}function O(n){return h(n,"CLAUDE.md")}async function v(){let n=[];for await(let t of process.stdin)n.push(t);return Buffer.concat(n).toString("utf-8")}function A(n){process.stdout.write(JSON.stringify(n))}function P(n){let t=n.cwd??process.cwd(),e=[];if(!w(t))return{continue:!0,message:"[maencof] Vault is not initialized. Run `/maencof:setup` to get started."};let o=$(t);o&&e.push(`[maencof:${o.name}] ${o.greeting}`),T(t,o?.name,e);let a=u(t,"wal.json");d(a)&&e.push("[maencof] Incomplete transaction (WAL) detected from a previous session. Run `/maencof:doctor` to diagnose.");let r=u(t,"schedule-log.json");if(d(r))try{let s=JSON.parse(x(r,"utf-8"));s.pending&&s.pending.length>0&&e.push(`[maencof] ${s.pending.length} pending task(s) found. Run \`/maencof:organize\` to process.`)}catch{}let i=u(t,"sessions");if(d(i)){let s=B(i);s&&e.push(`[maencof] Previous session summary:
${s}`)}let f=u(t,"data-sources.json");return d(f)||e.push("[maencof] No external data sources connected. Run `/maencof:connect` to set up."),{continue:!0,message:e.length>0?e.join(`

`):void 0}}function $(n){let t=u(n,"companion-identity.json");if(!d(t))return null;try{let e=JSON.parse(x(t,"utf-8"));return E(e)?{name:e.name,greeting:e.greeting}:null}catch{return null}}function T(n,t,e){try{let o=O(n);if(C(o)!==null)return;let r=V(n,t);M(o,r,{createIfMissing:!0}),e.push("[maencof] CLAUDE.md\uC5D0 maencof \uC9C0\uC2DC\uBB38\uC774 \uCD08\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4.")}catch{}}function V(n,t){return`${t?`# maencof Knowledge Space (${t})`:"# maencof Knowledge Space"}

## Vault
- \uACBD\uB85C: ${n}
- \uBAA8\uB378: 5-Layer (Core/Derived/External/Action/Context)

## \uB3C4\uAD6C
- \uBB38\uC11C: maencof_create, maencof_read, maencof_update, maencof_delete, maencof_move
- \uAC80\uC0C9: kg_search, kg_navigate, kg_context, kg_status, kg_build
- CLAUDE.md: claudemd_merge, claudemd_read, claudemd_remove
- \uC5F0\uACB0: kg_suggest_links

## \uADDC\uCE59
- \uC0C8 \uC815\uBCF4 \uCDE8\uB4DD \uC2DC kg_suggest_links\uB85C \uAE30\uC874 \uC9C0\uC2DD\uACFC \uC5F0\uACB0 \uAC00\uB2A5\uC131\uC744 \uD655\uC778\uD558\uC138\uC694
- L1_Core \uBB38\uC11C\uB294 \uC77D\uAE30 \uC804\uC6A9\uC785\uB2C8\uB2E4
- \uBB38\uC11C \uC0DD\uC131 \uC2DC \uBC18\uB4DC\uC2DC layer\uC640 tags\uB97C \uC9C0\uC815\uD558\uC138\uC694`}function B(n){try{let t=L(n).filter(r=>r.endsWith(".md")).sort().reverse();if(t.length===0)return null;let e=D(n,t[0]);return x(e,"utf-8").split(`
`).slice(0,10).join(`
`).trim()||null}catch{return null}}var J=await v(),y;try{let n=JSON.parse(J);y=P(n)}catch{y={continue:!0}}A(y);
