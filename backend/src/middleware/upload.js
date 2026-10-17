import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
export const uploadImages = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + EXT[file.mimetype]),
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG, PNG or WebP images are allowed'))),
}).array('images', 5);
export function removeFiles(urls = []) {
  for (const u of urls) { const f = path.join(UPLOAD_DIR, path.basename(u)); fs.promises.unlink(f).catch(() => {}); }
}
