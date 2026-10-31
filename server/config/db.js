import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../lib/logger.js';

mongoose.set('strictQuery', true);

export async function connectDB(uri = env.MONGO_URI) {
  await mongoose.connect(uri);
  logger.info('MongoDB connected');
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
