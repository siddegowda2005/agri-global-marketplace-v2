import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { env } from '../config/env.js';
import { saveImage, deleteImage } from '../services/filestore.js';

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Render's filesystem is ephemeral, so production stores images in MongoDB (GridFS).
// Locally and in tests we keep writing to disk. Force either mode with UPLOAD_STORAGE=gridfs|disk.
export const useGridFs =
  env.uploadStorage === 'gridfs' || (env.uploadStorage !== 'disk' && process.env.NODE_ENV === 'production');

const parse = multer({
  storage: useGridFs
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + EXT[file.mimetype]),
      }),
  limits: { fileSize: 3 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG, PNG or WebP images are allowed'))),
}).array('images', 5);

// Same shape as before: routes read req.files[].filename and build `/uploads/<name>`.
export function uploadImages(req, res, next) {
  parse(req, res, async (err) => {
    if (err) return next(err);
    if (!useGridFs || !req.files?.length) return next();
    try {
      for (const f of req.files) {
        const name = crypto.randomBytes(16).toString('hex') + EXT[f.mimetype];
        await saveImage(name, f.buffer, f.mimetype);
        f.filename = name;
      }
      next();
    } catch (e) {
      next(e);
    }
  });
}

export function removeFiles(urls = []) {
  for (const u of urls) {
    const name = path.basename(u);
    fs.promises.unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
    if (useGridFs) deleteImage(name);
  }
}
