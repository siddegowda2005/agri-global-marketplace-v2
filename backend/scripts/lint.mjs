import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
let bad = 0;
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) { const r = spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' }); if (r.status) { bad++; console.error(r.stderr); } } } })('src');
if (bad) process.exit(1); console.log('backend lint ok');
