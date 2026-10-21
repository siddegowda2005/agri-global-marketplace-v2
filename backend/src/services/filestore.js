// GridFS-backed image storage. Used in production so uploaded images survive
// redeploys (Render's container filesystem is wiped on every deploy).
import mongoose from 'mongoose';

const BUCKET = 'uploads';

function bucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB is not connected; GridFS is unavailable');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET });
}

export function saveImage(name, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const up = bucket().openUploadStream(name, { contentType });
    up.on('error', reject);
    up.on('finish', () => resolve(name));
    up.end(buffer);
  });
}

export function openImage(name) {
  return bucket().openDownloadStreamByName(name);
}

export async function deleteImage(name) {
  try {
    const docs = await bucket().find({ filename: name }).toArray();
    await Promise.all(docs.map((d) => bucket().delete(d._id)));
  } catch { /* not connected or already gone */ }
}
