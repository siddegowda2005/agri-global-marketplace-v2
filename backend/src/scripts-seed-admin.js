import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { User } from './models/User.js';
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ chars) in the environment.'); process.exit(1); }
await connectDb();
if (await User.exists({ email: ADMIN_EMAIL.toLowerCase() })) console.log('Admin already exists');
else { await User.create({ name: 'Administrator', email: ADMIN_EMAIL, role: 'admin', passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) }); console.log('Admin created'); }
await mongoose.disconnect();
