#!/usr/bin/env node
import { createRequire as __cpCreateRequire } from 'node:module';
const require = __cpCreateRequire(import.meta.url);

var Ht=Object.create;var ae=Object.defineProperty;var qt=Object.getOwnPropertyDescriptor;var Jt=Object.getOwnPropertyNames;var zt=Object.getPrototypeOf,Wt=Object.prototype.hasOwnProperty;var I=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,n)=>(typeof require<"u"?require:t)[n]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var h=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports);var Yt=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of Jt(t))!Wt.call(e,i)&&i!==n&&ae(e,i,{get:()=>t[i],enumerable:!(r=qt(t,i))||r.enumerable});return e};var Bt=(e,t,n)=>(n=e!=null?Ht(zt(e)):{},Yt(t||!e||!e.__esModule?ae(n,"default",{value:e,enumerable:!0}):n,e));var de=h((Mr,fe)=>{fe.exports=le;le.sync=cn;var ce=I("fs");function an(e,t){var n=t.pathExt!==void 0?t.pathExt:process.env.PATHEXT;if(!n||(n=n.split(";"),n.indexOf("")!==-1))return!0;for(var r=0;r<n.length;r++){var i=n[r].toLowerCase();if(i&&e.substr(-i.length).toLowerCase()===i)return!0}return!1}function ue(e,t,n){return!e.isSymbolicLink()&&!e.isFile()?!1:an(t,n)}function le(e,t,n){ce.stat(e,function(r,i){n(r,r?!1:ue(i,e,t))})}function cn(e,t){return ue(ce.statSync(e),e,t)}});var ye=h((Fr,he)=>{he.exports=pe;pe.sync=un;var me=I("fs");function pe(e,t,n){me.stat(e,function(r,i){n(r,r?!1:ge(i,t))})}function un(e,t){return ge(me.statSync(e),t)}function ge(e,t){return e.isFile()&&ln(e,t)}function ln(e,t){var n=e.mode,r=e.uid,i=e.gid,s=t.uid!==void 0?t.uid:process.getuid&&process.getuid(),a=t.gid!==void 0?t.gid:process.getgid&&process.getgid(),c=parseInt("100",8),l=parseInt("010",8),o=parseInt("001",8),u=c|l,f=n&o||n&l&&i===a||n&c&&r===s||n&u&&s===0;return f}});var Ee=h((jr,Se)=>{var Pr=I("fs"),M;process.platform==="win32"||global.TESTING_WINDOWS?M=de():M=ye();Se.exports=U;U.sync=fn;function U(e,t,n){if(typeof t=="function"&&(n=t,t={}),!n){if(typeof Promise!="function")throw new TypeError("callback not provided");return new Promise(function(r,i){U(e,t||{},function(s,a){s?i(s):r(a)})})}M(e,t||{},function(r,i){r&&(r.code==="EACCES"||t&&t.ignoreErrors)&&(r=null,i=!1),n(r,i)})}function fn(e,t){try{return M.sync(e,t||{})}catch(n){if(t&&t.ignoreErrors||n.code==="EACCES")return!1;throw n}}});var ke=h(($r,we)=>{var k=process.platform==="win32"||process.env.OSTYPE==="cygwin"||process.env.OSTYPE==="msys",_e=I("path"),dn=k?";":":",xe=Ee(),ve=e=>Object.assign(new Error(`not found: ${e}`),{code:"ENOENT"}),Ie=(e,t)=>{let n=t.colon||dn,r=e.match(/\//)||k&&e.match(/\\/)?[""]:[...k?[process.cwd()]:[],...(t.path||process.env.PATH||"").split(n)],i=k?t.pathExt||process.env.PATHEXT||".EXE;.CMD;.BAT;.COM":"",s=k?i.split(n):[""];return k&&e.indexOf(".")!==-1&&s[0]!==""&&s.unshift(""),{pathEnv:r,pathExt:s,pathExtExe:i}},Ce=(e,t,n)=>{typeof t=="function"&&(n=t,t={}),t||(t={});let{pathEnv:r,pathExt:i,pathExtExe:s}=Ie(e,t),a=[],c=o=>new Promise((u,f)=>{if(o===r.length)return t.all&&a.length?u(a):f(ve(e));let d=r[o],g=/^".*"$/.test(d)?d.slice(1,-1):d,m=_e.join(g,e),C=!g&&/^\.[\\\/]/.test(e)?e.slice(0,2)+m:m;u(l(C,o,0))}),l=(o,u,f)=>new Promise((d,g)=>{if(f===i.length)return d(c(u+1));let m=i[f];xe(o+m,{pathExt:s},(C,E)=>{if(!C&&E)if(t.all)a.push(o+m);else return d(o+m);return d(l(o,u,f+1))})});return n?c(0).then(o=>n(null,o),n):c(0)},mn=(e,t)=>{t=t||{};let{pathEnv:n,pathExt:r,pathExtExe:i}=Ie(e,t),s=[];for(let a=0;a<n.length;a++){let c=n[a],l=/^".*"$/.test(c)?c.slice(1,-1):c,o=_e.join(l,e),u=!l&&/^\.[\\\/]/.test(e)?e.slice(0,2)+o:o;for(let f=0;f<r.length;f++){let d=u+r[f];try{if(xe.sync(d,{pathExt:i}))if(t.all)s.push(d);else return d}catch{}}}if(t.all&&s.length)return s;if(t.nothrow)return null;throw ve(e)};we.exports=Ce;Ce.sync=mn});var Ae=h((Vr,G)=>{"use strict";var Oe=(e={})=>{let t=e.env||process.env;return(e.platform||process.platform)!=="win32"?"PATH":Object.keys(t).reverse().find(r=>r.toUpperCase()==="PATH")||"Path"};G.exports=Oe;G.exports.default=Oe});var Te=h((Ur,Re)=>{"use strict";var De=I("path"),pn=ke(),gn=Ae();function be(e,t){let n=e.options.env||process.env,r=process.cwd(),i=e.options.cwd!=null,s=i&&process.chdir!==void 0&&!process.chdir.disabled;if(s)try{process.chdir(e.options.cwd)}catch{}let a;try{a=pn.sync(e.command,{path:n[gn({env:n})],pathExt:t?De.delimiter:void 0})}catch{}finally{s&&process.chdir(r)}return a&&(a=De.resolve(i?e.options.cwd:"",a)),a}function hn(e){return be(e)||be(e,!0)}Re.exports=hn});var Le=h((Gr,q)=>{"use strict";var H=/([()\][%!^"`<>&|;, *?])/g;function yn(e){return e=e.replace(H,"^$1"),e}function Sn(e,t){return e=`${e}`,e=e.replace(/(?=(\\+?)?)\1"/g,'$1$1\\"'),e=e.replace(/(?=(\\+?)?)\1$/,"$1$1"),e=`"${e}"`,e=e.replace(H,"^$1"),t&&(e=e.replace(H,"^$1")),e}q.exports.command=yn;q.exports.argument=Sn});var Me=h((Hr,Ne)=>{"use strict";Ne.exports=/^#!(.*)/});var Pe=h((qr,Fe)=>{"use strict";var En=Me();Fe.exports=(e="")=>{let t=e.match(En);if(!t)return null;let[n,r]=t[0].replace(/#! ?/,"").split(" "),i=n.split("/").pop();return i==="env"?r:r?`${i} ${r}`:i}});var $e=h((Jr,je)=>{"use strict";var J=I("fs"),_n=Pe();function xn(e){let n=Buffer.alloc(150),r;try{r=J.openSync(e,"r"),J.readSync(r,n,0,150,0),J.closeSync(r)}catch{}return _n(n.toString())}je.exports=xn});var He=h((zr,Ge)=>{"use strict";var vn=I("path"),Ve=Te(),Ue=Le(),In=$e(),Cn=process.platform==="win32",wn=/\.(?:com|exe)$/i,kn=/node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;function On(e){e.file=Ve(e);let t=e.file&&In(e.file);return t?(e.args.unshift(e.file),e.command=t,Ve(e)):e.file}function An(e){if(!Cn)return e;let t=On(e),n=!wn.test(t);if(e.options.forceShell||n){let r=kn.test(t);e.command=vn.normalize(e.command),e.command=Ue.command(e.command),e.args=e.args.map(s=>Ue.argument(s,r));let i=[e.command].concat(e.args).join(" ");e.args=["/d","/s","/c",`"${i}"`],e.command=process.env.comspec||"cmd.exe",e.options.windowsVerbatimArguments=!0}return e}function Dn(e,t,n){t&&!Array.isArray(t)&&(n=t,t=null),t=t?t.slice(0):[],n=Object.assign({},n);let r={command:e,args:t,options:n,file:void 0,original:{command:e,args:t}};return n.shell?r:An(r)}Ge.exports=Dn});var ze=h((Wr,Je)=>{"use strict";var z=process.platform==="win32";function W(e,t){return Object.assign(new Error(`${t} ${e.command} ENOENT`),{code:"ENOENT",errno:"ENOENT",syscall:`${t} ${e.command}`,path:e.command,spawnargs:e.args})}function bn(e,t){if(!z)return;let n=e.emit;e.emit=function(r,i){if(r==="exit"){let s=qe(i,t);if(s)return n.call(e,"error",s)}return n.apply(e,arguments)}}function qe(e,t){return z&&e===1&&!t.file?W(t.original,"spawn"):null}function Rn(e,t){return z&&e===1&&!t.file?W(t.original,"spawnSync"):null}Je.exports={hookChildProcess:bn,verifyENOENT:qe,verifyENOENTSync:Rn,notFoundError:W}});var Be=h((Yr,O)=>{"use strict";var We=I("child_process"),Y=He(),B=ze();function Ye(e,t,n){let r=Y(e,t,n),i=We.spawn(r.command,r.args,r.options);return B.hookChildProcess(i,r),i}function Tn(e,t,n){let r=Y(e,t,n),i=We.spawnSync(r.command,r.args,r.options);return i.error=i.error||B.verifyENOENTSync(i.status,r),i}O.exports=Ye;O.exports.spawn=Ye;O.exports.sync=Tn;O.exports._parse=Y;O.exports._enoent=B});import{existsSync as Kt,mkdirSync as Xt,readFileSync as Zt,writeFileSync as Qt}from"node:fs";import{homedir as en}from"node:os";import{dirname as tn,join as nn}from"node:path";var rn=256*1024;function on(e){return nn(en(),".claude","plugins",e,"error-log.json")}function sn(e){if(e instanceof Error)return`${e.message}${e.stack?`
${e.stack}`:""}`;try{return JSON.stringify(e)}catch{return String(e)}}function N(e,t,n,r={}){let i=r.logFile??on(e);Xt(tn(i),{recursive:!0});let s=[];if(Kt(i))try{let c=JSON.parse(Zt(i,"utf8"));Array.isArray(c)&&(s=c)}catch{s=[]}s.push({timestamp:new Date().toISOString(),hook:t,error:sn(n)});let a=JSON.stringify(s,null,2);for(;Buffer.byteLength(a)>rn&&s.length>1;)s.shift(),a=JSON.stringify(s,null,2);Qt(i,a)}var Xe=Bt(Be(),1);import{spawn as Nn}from"node:child_process";function F(e){return e.replace(/^\uFEFF/,"").replace(/\r\n/g,`
`)}import{homedir as Ln}from"node:os";var K={home(){return process.env.HOME??process.env.USERPROFILE??Ln()},get isWindows(){return process.platform==="win32"},get isMacOS(){return process.platform==="darwin"},get isLinux(){return process.platform==="linux"},get pathDelimiter(){return process.platform==="win32"?";":":"},get eol(){return process.platform==="win32"?`\r
`:`
`}};function Ke(e){return K.isWindows?Math.max(e*3,5e3):e}function P(e,t,n={}){let r=n.encoding??"utf8",i=n.normalizeEol!==!1,s=n.timeoutMs!==void 0?Ke(n.timeoutMs):void 0;return new Promise(a=>{let c=(0,Xe.default)(e,[...t],{cwd:n.cwd,env:n.env,stdio:["pipe","pipe","pipe"]}),l="",o="",u=!1,f,d=!1,g=null,m=s?setTimeout(()=>{u=!0,process.platform==="win32"&&c.pid!==void 0?Nn("taskkill",["/pid",String(c.pid),"/T","/F"],{stdio:"ignore"}):c.kill("SIGKILL"),g=setTimeout(()=>C(null),1e3)},s):null;function C(E){d||(d=!0,m&&clearTimeout(m),g&&clearTimeout(g),a({code:E,stdout:i?F(l):l,stderr:i?F(o):o,timedOut:u,spawnError:f}))}c.on("error",E=>{f=E,C(null)}),c.stdout?.on("data",E=>{l+=E.toString(r)}),c.stderr?.on("data",E=>{o+=E.toString(r)}),n.input!==void 0&&c.stdin?(c.stdin.write(n.input),c.stdin.end()):c.stdin&&c.stdin.end(),c.on("close",E=>C(E))})}async function Ze(e={}){let t=[],n=e.spawnTimeoutMs??2e3,r=await P("node",["--version"],{timeoutMs:n}),i=r.code===0&&!r.spawnError;i||t.push(`node --version failed (code=${r.code}, error=${r.spawnError?.message??"none"})`);let s=await P("git",["--version"],{timeoutMs:n}),a=s.code===0&&!s.spawnError;a||t.push(`git --version failed (code=${s.code}, error=${s.spawnError?.message??"none"})`);let l=(process.env.PATH??process.env.Path??"").length;l===0&&t.push("PATH environment variable is empty");let o=!!process.env.CLAUDE_PLUGIN_ROOT;o||t.push("CLAUDE_PLUGIN_ROOT not set");let u={nodeOk:i,gitOk:a,pathLen:l,pluginRootResolved:o,errors:t};return e.writeLog&&t.length>0&&e.pkg&&N(e.pkg,"self-probe",{errors:t}),u}import{existsSync as tt}from"node:fs";import{join as j}from"node:path";var Qe=".maencof",x=".maencof-meta",et="dailynotes";function nt(e){return tt(j(e,Qe))||tt(j(e,x))}function y(e,...t){return j(e,x,...t)}function rt(e){return j(e,"CLAUDE.md")}async function it(){let e=[];for await(let t of process.stdin)e.push(t);return Buffer.concat(e).toString("utf-8")}function ot(e){process.stdout.write(JSON.stringify(e))}import{existsSync as A,readFileSync as w,readdirSync as Er,writeFileSync as $t}from"node:fs";import{join as _r}from"node:path";var Si={1:"01_Core",2:"02_Derived",3:"03_External",4:"04_Action",5:"05_Context"};var X="2.0.0";function Z(e,t){return`${t?`# maencof Knowledge Space (${t})`:"# maencof Knowledge Space"}

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
- When the user says "\uAE30\uC5B5\uD574\uC918", "\uAE30\uC5B5\uD574", "remember this", "save this", "\uAE30\uB85D\uD574", "\uBA54\uBAA8\uD574" or similar memory requests, ALWAYS route to \`/maencof:remember\` skill or \`create\` tool.
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
| /maencof:remember | Record new knowledge |
| /maencof:recall | Search past knowledge |
| /maencof:explore | Explore knowledge graph |
| /maencof:organize | Organize/review knowledge |
| /maencof:reflect | Reflect on knowledge |
| /maencof:insight | Manage auto-insight capture |

## Auto-Insight Capture

When auto-insight capture is enabled, monitor the conversation for user insights worth preserving.
When you detect a meaningful insight during conversation, call \`capture_insight\` to record it.
Do NOT ask for confirmation \u2014 capture proactively. The user can review later via \`/maencof:insight --recent\`.
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
  "Tag '{tag}' is used in {N} documents but has no concept document. Create one with \`/maencof:remember --layer 3 --sub-layer topical --title "{tag}" --tags {tag},concept\`?"
- Use \`kg_search\` with the tag as seed to check for existing concept documents before suggesting.
- Do NOT auto-create concept documents \u2014 always suggest and wait for user confirmation.

## Status Documents (Layer 4)

- Create \`04_Action/\` status documents for: ongoing research, active decisions, session context
- Set \`expires\` to 7 days for volatile context, 30 days for project status
- The system tracks document freshness automatically via the knowledge graph`}var Q="maencof-meta-skill";import{copyFileSync as Mn,existsSync as at,readFileSync as ct,writeFileSync as st}from"node:fs";var D="<!-- MAENCOF:START -->",b="<!-- MAENCOF:END -->";function ee(e,t,n={}){let{dryRun:r=!1,createIfMissing:i=!0}=n,s=[D,t.trim(),b].join(`
`);if(!at(e)){if(!i)return{changed:!1,hadExistingSection:!1,content:s};let d=s+`
`;return r||st(e,d,"utf-8"),{changed:!0,hadExistingSection:!1,content:d}}let a=ct(e,"utf-8"),c=a.indexOf(D),l=a.indexOf(b),o,u;if(c!==-1&&l!==-1&&c<l){u=!0;let d=a.slice(0,c),g=a.slice(l+b.length);o=d+s+g}else{u=!1;let d=a.endsWith(`
`)?`
`:`

`;o=a+d+s+`
`}if(o===a)return{changed:!1,hadExistingSection:u,content:a};let f;return r||(f=e+".bak",Mn(e,f),st(e,o,"utf-8")),{changed:!0,hadExistingSection:u,backupPath:f,content:o}}function ut(e){if(!at(e))return null;let t=ct(e,"utf-8"),n=t.indexOf(D),r=t.indexOf(b);if(n===-1||r===-1||n>=r)return null;let i=n+D.length;return t.slice(i,r).trim()}import{appendFileSync as Fn,existsSync as Pn,mkdirSync as jn,writeFileSync as $n}from"node:fs";import{dirname as Vn,join as lt}from"node:path";function Un(e){return lt(e,".maencof-meta",et)}function Gn(e,t){let n=t??mt(new Date);return lt(Un(e),`${n}.md`)}function Hn(e){let t=e.path?` \u2192 ${e.path}`:"";return`- **[${e.time}]** \`${e.category}\` ${e.description}${t}`}function ft(e,t){let n=Gn(e),r=Vn(n);jn(r,{recursive:!0});let i=Hn(t);if(Pn(n))Fn(n,i+`
`,"utf-8");else{let a=`# Dailynote \u2014 ${mt(new Date)}

## Activity Log

`;$n(n,a+i+`
`,"utf-8")}}function dt(e){let t=String(e.getHours()).padStart(2,"0"),n=String(e.getMinutes()).padStart(2,"0");return`${t}:${n}`}function mt(e){let t=e.getFullYear(),n=String(e.getMonth()+1).padStart(2,"0"),r=String(e.getDate()).padStart(2,"0");return`${t}-${n}-${r}`}import{existsSync as zn,mkdirSync as Ni,readFileSync as Wn,writeFileSync as Mi}from"node:fs";import{dirname as Pi,join as Yn}from"node:path";var _={schema_version:1,injection:{enabled:!0,budget_chars:2e3},session_recap:{enabled:!0}},pt="MAENCOF_DISABLE_DIALOGUE",gt="dialogue-config.json";function te(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function ht(e,t){return typeof e=="boolean"?e:t}function yt(e,t){return typeof e=="number"&&Number.isInteger(e)&&e>=0?e:t}function qn(e){let t=_.injection;if(e===null||typeof e!="object"||Array.isArray(e))return{...t};let n=e;return{enabled:ht(n.enabled,t.enabled),budget_chars:yt(n.budget_chars,t.budget_chars)}}function Jn(e){let t=_.session_recap;return e===null||typeof e!="object"||Array.isArray(e)?{...t}:{enabled:ht(e.enabled,t.enabled)}}function St(e){if(!te(e))return{..._,injection:{..._.injection},session_recap:{..._.session_recap}};let t=e;return{schema_version:yt(t.schema_version,_.schema_version),injection:qn(t.injection),session_recap:Jn(t.session_recap)}}function Bn(e){return Yn(e,x,gt)}function Kn(e){let t=Bn(e);if(!zn(t))return _;try{let n=JSON.parse(Wn(t,"utf-8"));return te(n)?St(n):_}catch{return _}}function Et(e,t=process.env){return t[pt]==="1"?!0:Kn(e).injection.enabled===!1}import{existsSync as xt,mkdirSync as Zn,readFileSync as Qn,writeFileSync as er}from"node:fs";import{dirname as tr,join as nr}from"node:path";var _t="error-log.json";function vt(e){return nr(e,x,_t)}function rr(e){let t=tr(e);xt(t)||Zn(t,{recursive:!0})}function ir(e){let t=vt(e);if(!xt(t))return[];try{return JSON.parse(Qn(t,"utf-8"))}catch{return[]}}function or(e,t){let n=ir(e);for(n.push(t);n.length>200;)n.shift();let r=vt(e);rr(r),er(r,JSON.stringify(n),"utf-8")}function p(e,t){try{or(e,t)}catch{}}import{existsSync as $,mkdirSync as Zi,readFileSync as oe,unlinkSync as lr,writeFileSync as Qi}from"node:fs";import{dirname as to,join as fr}from"node:path";var S={enabled:!0,sensitivity:"medium",max_captures_per_session:10,notify:!0,category_filter:{principle:!0,refuted_premise:!1,ephemeral_candidate:!1}},R={total_captured:0,l2_direct:0,l5_captured:0,l5_promoted:0,l5_archived:0,updatedAt:new Date().toISOString()},ne="pending-insight-notification.json",re={high:"all opinions, experiences, discoveries, questions, conclusions, analogies, judgments. When in doubt, capture.",medium:"conclusions, deep experiences, significant discoveries, explicit judgments. Skip: simple opinions, incomplete questions, casual remarks.",low:"only verified experience+conclusion pairs, established principles, major discoveries. Skip most."};var sr=["high","medium","low"];function ie(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function T(e,t){return typeof e=="boolean"?e:t}function ar(e){return sr.includes(e)?e:S.sensitivity}function cr(e){return typeof e=="number"&&Number.isInteger(e)&&e>=0?e:S.max_captures_per_session}function ur(e){let t=S.category_filter;if(e===null||typeof e!="object"||Array.isArray(e))return{...t};let n=e;return{principle:T(n.principle,t.principle),refuted_premise:T(n.refuted_premise,t.refuted_premise),ephemeral_candidate:T(n.ephemeral_candidate,t.ephemeral_candidate)}}function It(e){if(!ie(e))return{...S};let t=e;return{enabled:T(t.enabled,S.enabled),sensitivity:ar(t.sensitivity),max_captures_per_session:cr(t.max_captures_per_session),notify:T(t.notify,S.notify),category_filter:ur(t.category_filter)}}function V(e,...t){return fr(e,x,...t)}function se(e){let t=V(e,"insight-config.json");if(!$(t))return S;try{let n=JSON.parse(oe(t,"utf-8"));return ie(n)?It(n):S}catch{return S}}function dr(e){let t=V(e,"auto-insight-stats.json");if(!$(t))return{...R};try{return JSON.parse(oe(t,"utf-8"))}catch{return{...R}}}function Ct(e){let t=V(e,ne);if(!$(t))return null;try{return JSON.parse(oe(t,"utf-8"))}catch{return null}}function wt(e){let t=V(e,ne);if($(t))try{lr(t)}catch{}}function mr(e){let t=e.l5_promoted+e.l5_archived;return t===0?null:e.l5_promoted/t}function kt(e){let t=dr(e),n=mr(t);if(n===null)return{adjusted:!1,message:null};let r=se(e),i=null;return n<.3&&r.sensitivity!=="low"?i=r.sensitivity==="high"?"medium":"low":n>.8&&r.sensitivity!=="high"&&(i=r.sensitivity==="low"?"medium":"high"),i===null?{adjusted:!1,message:null}:{adjusted:!1,message:`Insight precision is ${(n*100).toFixed(0)}%. Sensitivity adjustment recommended: ${r.sensitivity} \u2192 ${i}`}}function Ot(e){let t=re[e.sensitivity]??re.medium;return`<auto-insight enabled="${e.enabled}" sensitivity="${e.sensitivity}" max="${e.max_captures_per_session}">
Detect user insights. Call capture_insight on detection. No confirmation.
Notify: \u{1F4A1} Insight recorded to L{layer}: "{title}"

${e.sensitivity}: ${t}

L2=validated conclusions/principles L5=impressions/questions/exploratory
Ignore: tool requests, file ops, builds, acks, greetings, slash commands.
</auto-insight>`}function At(e){if(e===null||typeof e!="object")return!1;let t=e;return typeof t.schema_version=="number"&&t.schema_version>=1&&typeof t.name=="string"&&t.name.length>0&&typeof t.greeting=="string"&&t.greeting.length>0}var v="0.4.0";import{existsSync as Nt,mkdirSync as pr,readFileSync as gr,writeFileSync as Mt}from"node:fs";var Dt={enabled:!1},bt={version:1,actions:[]},Rt=()=>({sources:[],updatedAt:new Date().toISOString()}),Tt={};var Lt=[{filename:"insight-config.json",schemaVersion:1,defaultValue:()=>({...S,_schemaVersion:1})},{filename:"auto-insight-stats.json",schemaVersion:1,defaultValue:()=>({...R,updatedAt:new Date().toISOString(),_schemaVersion:1})},{filename:"vault-commit.json",schemaVersion:1,defaultValue:()=>({...Dt,_schemaVersion:1})},{filename:"lifecycle.json",schemaVersion:1,defaultValue:()=>({...bt,actions:[],_schemaVersion:1})},{filename:"data-sources.json",schemaVersion:1,defaultValue:()=>({...Rt(),_schemaVersion:1})},{filename:"usage-stats.json",defaultValue:()=>({...Tt})}];function hr(e,t){let n={...e};for(let[r,i]of Object.entries(t))r in n||(n[r]=i);return n._schemaVersion=t._schemaVersion,n}function Ft(e){let t={created:[],skipped:[],migrated:[]},n=y(e);Nt(n)||pr(n,{recursive:!0});for(let r of Lt){let i=y(e,r.filename);if(Nt(i))if(r.schemaVersion!=null)try{let s=JSON.parse(gr(i,"utf-8"));if((s._schemaVersion??0)<r.schemaVersion){let c=r.defaultValue(),l=hr(s,c);Mt(i,JSON.stringify(l),"utf-8"),t.migrated.push(r.filename)}else t.skipped.push(r.filename)}catch(s){p(e,{hook:"config-provisioner",error:String(s),timestamp:new Date().toISOString()}),t.skipped.push(r.filename)}else t.skipped.push(r.filename);else{let s=r.defaultValue();Mt(i,JSON.stringify(s),"utf-8"),t.created.push(r.filename)}}return t}var Pt=`# Using maencof \u2014 Dialogue Discipline

Observe every session. CLAUDE.md / AGENTS.md user instructions override this meta-skill.

## 1. Instruction Priority

1. CLAUDE.md / AGENTS.md user instructions
2. maencof dialogue discipline (this meta-skill)
3. Default system prompt

## 2. 6 Role \u2192 Skill Mapping

| Role | Skill |
|---|---|
| Brainstorming / ideation | \`explore --for-brainstorm\` \u2192 \`think --mode divergent\` |
| Insight capture management | \`insight\` + \`capture_insight\` MCP tool |
| Spec refinement | \`refine\` (Phase 2.5 Socratic included) |
| Interview convergence | \`refine\` Phase 2.5 |
| Plan review | \`think --mode review\` |
| Session retrospective | SessionEnd hook automatic recap (no explicit invocation) |

## 3. Flow & Priority

1. Vague / ambiguous input \u2192 \`refine\` first. If alternatives still remain, then \`think --mode default\`.
2. Ideation signals ("idea", "stuck", "brainstorm") \u2192 \`explore --for-brainstorm\` (seed first) \u2192 \`think --mode divergent\`. Never invoke \`think\` without a sufficient seed \u2014 run \`explore\` beforehand.
3. Plan / spec path ref + "review" / "check" \u2192 \`think --mode review\`.
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
`;function Vt(e){let t=e.cwd??process.cwd(),n=[];if(!nt(t))return{continue:!0,hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:"[maencof] Vault is not initialized. Run `/maencof:setup` to get started."}};let r=Ir(t);r&&n.push(`[maencof:${r.name}] ${r.greeting}`),Cr(t,r?.name,n);try{let o=Ft(t);o.created.length>0&&n.push(`[maencof] Config files provisioned: ${o.created.join(", ")}`),o.migrated.length>0&&n.push(`[maencof] Config schemas updated: ${o.migrated.join(", ")}`)}catch(o){p(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}kr(t,n),Or(t,n);let i=y(t,"wal.json");A(i)&&n.push("[maencof] Incomplete transaction (WAL) detected from a previous session. Run `/maencof:checkup` to diagnose.");let s=y(t,"schedule-log.json");if(A(s))try{let o=JSON.parse(w(s,"utf-8"));o.pending&&o.pending.length>0&&n.push(`[maencof] ${o.pending.length} pending task(s) found. Run \`/maencof:organize\` to process.`)}catch(o){p(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}let a=y(t,"sessions");if(A(a)){let o=Ar(a);o&&n.push(`[maencof] Previous session summary:
${o}`)}let c=y(t,"data-sources.json");try{let o=w(c,"utf-8"),u=JSON.parse(o);(!u.sources||u.sources.length===0)&&n.push("[maencof] No external data sources connected. Run `/maencof:connect` to set up.")}catch(o){p(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()}),n.push("[maencof] No external data sources connected. Run `/maencof:connect` to set up.")}try{let o=kt(t);o.message&&n.push(`[maencof] ${o.message}`)}catch(o){p(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}try{let o=se(t);o.enabled&&n.push(Ot(o));let u=Ct(t);if(u&&u.captures.length>0){let f=u.captures.filter(m=>m.layer===2).length,d=u.captures.filter(m=>m.layer===5).length,g=u.captures.map(m=>`  - L${m.layer}: "${m.title}"`).join(`
`);n.push(`\u{1F4A1} \uC9C0\uB09C \uC138\uC158\uC5D0\uC11C ${u.captures.length}\uAC1C \uC778\uC0AC\uC774\uD2B8\uB97C \uC790\uB3D9 \uCEA1\uCC98\uD588\uC2B5\uB2C8\uB2E4 (L2: ${f}, L5: ${d}):
${g}
/maencof:insight --recent \uB85C \uD655\uC778\uD558\uC138\uC694.`),wt(t)}}catch(o){p(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}try{let o=e.session_id??"unknown";ft(t,{time:dt(new Date),category:"session",description:`Session started (session_id: ${o})`})}catch(o){p(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}let l={continue:!0};try{let o=vr(t),u=n.length>0?n.join(`

`):null,f=xr(o,u);f!==null&&(l.hookSpecificOutput={hookEventName:"SessionStart",additionalContext:f})}catch(o){p(t,{hook:"session-start",error:String(o),timestamp:new Date().toISOString()})}return l}function xr(e,t){return e&&t?`${e}

${t}`:e??t}function vr(e){if(Et(e))return null;let t=Pt;return[...t].length>2500?null:`<${Q}>
${t}
</${Q}>`}function Ir(e){let t=y(e,"companion-identity.json");if(!A(t))return null;try{let n=JSON.parse(w(t,"utf-8"));return At(n)?{name:n.name,greeting:n.greeting}:null}catch(n){return p(e,{hook:"session-start",error:String(n),timestamp:new Date().toISOString()}),null}}function Cr(e,t,n){let r=!1;try{let i=rt(e),s=ut(i),a=Ut(e);if(s===null){let c=Z(e,t);ee(i,c,{createIfMissing:!0}),jt(e,v),n.push("[maencof] maencof directives initialized in CLAUDE.md."),r=!0}else if(a===null)jt(e,v),r=!0;else if(a!==v){let c=Z(e,t);ee(i,c,{createIfMissing:!1}),wr(e,a),n.push(`[maencof] CLAUDE.md directives updated (${a} \u2192 ${v}).`),r=!0}}catch(i){p(e,{hook:"session-start",error:String(i),timestamp:new Date().toISOString()})}return r}function Ut(e){let t=y(e,"version.json");if(!A(t))return null;try{return JSON.parse(w(t,"utf-8")).version??null}catch(n){return p(e,{hook:"session-start",error:String(n),timestamp:new Date().toISOString()}),null}}function jt(e,t){let n=y(e,"version.json"),r={version:t,installedAt:new Date().toISOString(),migrationHistory:[]};$t(n,JSON.stringify(r),"utf-8")}function wr(e,t){let n=y(e,"version.json"),r;try{r=JSON.parse(w(n,"utf-8"))}catch(i){p(e,{hook:"session-start",error:String(i),timestamp:new Date().toISOString()}),r={version:t,installedAt:new Date().toISOString(),migrationHistory:[]}}r.migrationHistory.push(`${t} -> ${v}`),r.version=v,r.lastMigratedAt=new Date().toISOString(),$t(n,JSON.stringify(r),"utf-8")}function kr(e,t){try{let n=y(e,"version.json"),r="1.0.0";A(n)&&(r=JSON.parse(w(n,"utf-8")).architecture_version??"1.0.0"),r!==X&&t.push(`[maencof] Architecture update available (${r} \u2192 ${X}).
L3 sub-layers (relational/structural/topical) and L5 sub-layers (buffer/boundary) are now supported.
Run \`/maencof:migrate\` to upgrade your vault structure.`)}catch(n){p(e,{hook:"session-start",error:String(n),timestamp:new Date().toISOString()})}}function Or(e,t){try{let n=Ut(e);n!==null&&n!==v&&t.push(`[maencof] Plugin updated (${n} \u2192 ${v}).
Run \`/maencof:setup\` to complete the migration.`)}catch(n){p(e,{hook:"session-start",error:String(n),timestamp:new Date().toISOString()})}}function Ar(e){try{let t=Er(e).filter(s=>s.endsWith(".md")).sort().reverse();if(t.length===0)return null;let n=_r(e,t[0]);return w(n,"utf-8").split(`
`).slice(0,10).join(`
`).trim()||null}catch{return null}}var Gt=await Ze({writeLog:!0,pkg:"maencof"}),Dr=await it(),L;try{let e=JSON.parse(Dr);L=Vt(e)}catch(e){N("maencof","session-start",e),L={continue:!0}}if(Gt.errors.length>0){let e=`[maencof] hook bootstrap diagnostic \u2014 some hooks may not work:
`+Gt.errors.map(n=>`  - ${n}`).join(`
`)+`
See ~/.claude/plugins/maencof/error-log.json for details.`,t=L.hookSpecificOutput?.additionalContext;L.hookSpecificOutput={hookEventName:"SessionStart",additionalContext:t?`${t}

${e}`:e}}ot(L);
