// Import researched company records from a JSON file (array of objects). Records are stored UNVERIFIED:
// an admin must open each one, check its sources and click Verify (with written evidence).
// Usage: node src/scripts-import-companies.js data/companies.seed.json
import fs from 'node:fs';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { Company } from './models/Company.js';
import { companySchema } from './validators/schemas.js';
const file = process.argv[2];
if (!file) { console.error('Usage: node src/scripts-import-companies.js <file.json>'); process.exit(1); }
const records = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(records)) { console.error('File must contain a JSON array'); process.exit(1); }
await connectDb();
let added = 0, skipped = 0, invalid = 0;
for (const [i, raw] of records.entries()) {
  if (raw._template || raw._comment) { skipped++; continue; }
  const { _note, ...rec } = raw;
  const parsed = companySchema.safeParse(rec);
  if (!parsed.success) { invalid++; console.error(`#${i} (${raw.name || '?'}): ${parsed.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ')}`); continue; }
  const d = parsed.data;
  if (await Company.exists({ type: d.type, country: d.country, name: d.name })) { skipped++; continue; }
  await Company.create({ ...d, sources: d.sources?.length ? d.sources : [{ url: d.sourceUrl, label: 'Primary source', checkedAt: new Date() }], lastCheckedAt: new Date(), verificationStatus: 'unverified' });
  added++;
}
console.log(`Imported ${added}, skipped ${skipped} (existing/template), invalid ${invalid}. Now verify them in Admin > Companies.`);
await mongoose.disconnect();
