// Copy your local database into a hosted MongoDB (MongoDB Atlas) and move the local
// upload files into GridFS, so the deployed app shows the same real data (companies,
// exporters, listings) and its images survive redeploys.
//
// Safe + repeatable: it only inserts/updates documents. Nothing is deleted, and locally
// tagged DEMO companies are skipped so fake records never become "verified buyers".
//
// Usage (run from the backend/ folder):
//   SOURCE_MONGODB_URI=mongodb://127.0.0.1:27017/agri_marketplace `
//   MONGODB_URI="mongodb+srv://user:pass@cluster/agri_marketplace" node src/scripts-migrate-to-cloud.js
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const SOURCE = process.env.SOURCE_MONGODB_URI || 'mongodb://127.0.0.1:27017/agri_marketplace';
const TARGET = process.env.MONGODB_URI;
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

if (!TARGET) { console.error('Set MONGODB_URI to your hosted database and SOURCE_MONGODB_URI to your local one.'); process.exit(1); }
if (TARGET === SOURCE) { console.error('SOURCE_MONGODB_URI and MONGODB_URI are the same; nothing to do.'); process.exit(1); }

const isDemo = (c) => /SAMPLE \/ DEMO DATA/i.test(String(c.verificationEvidence || '')) || /^DEMO /i.test(String(c.name || ''));

async function copyCollections(src, tgt) {
  const names = (await src.db.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.') && !/^uploads\.(files|chunks)$/.test(n));

  let total = 0, skippedDemo = 0;
  for (const name of names) {
    let docs = await src.db.collection(name).find({}).toArray();
    if (name === 'companies') {
      const before = docs.length;
      docs = docs.filter((d) => !isDemo(d));
      skippedDemo += before - docs.length;
    }
    if (!docs.length) { console.log(`  ${name}: 0`); continue; }
    const res = await tgt.db.collection(name).bulkWrite(
      docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
      { ordered: false });
    total += docs.length;
    console.log(`  ${name}: ${docs.length} copied (new ${res.upsertedCount}, updated ${res.modifiedCount})`);
  }
  if (skippedDemo) console.log(`  companies: skipped ${skippedDemo} record(s) tagged as SAMPLE / DEMO DATA`);
  return total;
}

async function copyUploads(tgt) {
  if (!fs.existsSync(UPLOAD_DIR)) { console.log('  no local uploads folder, skipping images'); return 0; }
  const bucket = new mongoose.mongo.GridFSBucket(tgt.db, { bucketName: 'uploads' });
  const existing = new Set((await bucket.find({}).toArray()).map((f) => f.filename));
  const names = fs.readdirSync(UPLOAD_DIR).filter((f) => f !== '.gitkeep' && !f.startsWith('.'));
  let n = 0;
  for (const name of names) {
    if (existing.has(name)) continue;
    const buf = fs.readFileSync(path.join(UPLOAD_DIR, name));
    await new Promise((resolve, reject) => {
      const up = bucket.openUploadStream(name, { contentType: mimeOf(name) });
      up.on('error', reject); up.on('finish', resolve); up.end(buf);
    });
    n += 1;
  }
  return n;
}

function mimeOf(name) {
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

const src = await mongoose.createConnection(SOURCE).asPromise();
const tgt = await mongoose.createConnection(TARGET).asPromise();
console.log(`Copying documents: ${SOURCE} -> ${TARGET.replace(/\/\/[^@]*@/, '//***@')}`);
const docs = await copyCollections(src, tgt);
console.log(`Uploading local images into GridFS...`);
const imgs = await copyUploads(tgt);
console.log(`\nDone. ${docs} document(s) and ${imgs} image(s) copied.`);
await Promise.all([src.close(), tgt.close()]);
process.exit(0);
