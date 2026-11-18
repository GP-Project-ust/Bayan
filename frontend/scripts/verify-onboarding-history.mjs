import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const required=['app/platform/onboarding/history/page.tsx','components/onboarding-history/OnboardingHistoryScreen.tsx','components/onboarding-history/onboarding-history.css','lib/onboarding-history/history.ts','docs/SCREEN_34_ONBOARDING_HISTORY.md','docs/flows/42-onboarding-history-flow.mmd','docs/flows/42-onboarding-history-flow.dot','docs/flows/42-onboarding-history-flow.png','docs/flows/42-onboarding-history-flow.svg','tests/contracts/onboarding-history.test.mjs','tests/e2e/onboarding-history.spec.ts'];
for(const rel of required){const file=path.join(root,rel);assert.ok(fs.existsSync(file)&&fs.statSync(file).size>100,`Missing or empty: ${rel}`);}
const hashes=JSON.parse(fs.readFileSync(path.join(root,'docs/SCREEN_28_REFERENCE_HASHES.json'),'utf8'));
for(const [rel,hash] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex'),hash,`Reference modified: ${rel}`);
const catalog=JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8'));assert.equal(catalog.length,42);assert.equal(catalog.find(x=>x.path==='/platform/onboarding/history').kind,'list');
const route=fs.readFileSync(path.join(root,'app/platform/onboarding/history/page.tsx'),'utf8');assert.match(route,/OnboardingHistoryScreen/);
const catchall=fs.readFileSync(path.join(root,'app/[...slug]/page.tsx'),'utf8');assert.match(catchall,/x\.path!=="\/platform\/onboarding\/history"/);
const css=fs.readFileSync(path.join(root,'components/onboarding-history/onboarding-history.css'),'utf8');assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/prefers-reduced-motion/);
let total=0;function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isDirectory()){if(!['node_modules','.next','.git'].includes(entry.name))walk(path.join(dir,entry.name));continue;}if(!/\.tsx?$/.test(entry.name))continue;const full=path.join(dir,entry.name);const src=fs.readFileSync(full,'utf8');const ast=ts.createSourceFile(full,src,ts.ScriptTarget.Latest,true,entry.name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(ast.parseDiagnostics.length,0,`Syntax error: ${full}`);total++;}}walk(root);
console.log(`PASS screen34: ${total} TS/TSX files parsed, 42 catalog routes, source assets & RBAC policy unchanged.`);
