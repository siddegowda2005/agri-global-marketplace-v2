// Minimal real check: every src file must parse as JSX (via esbuild bundled with Vite).
import { transformSync } from 'esbuild';
import fs from 'node:fs'; import path from 'node:path';
let bad = 0;
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f);
  if (fs.statSync(p).isDirectory()) walk(p);
  else if (/\.(jsx?|mjs)$/.test(f)) { try { transformSync(fs.readFileSync(p, 'utf8'), { loader: 'jsx' }); } catch (e) { bad++; console.error(`${p}: ${e.message}`); } } })('src');
if (bad) process.exit(1); console.log('lint ok');
