import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectDb(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  await mongoose.syncIndexes();
}
