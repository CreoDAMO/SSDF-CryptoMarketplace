import mongoose from 'mongoose';

export async function connectToDB() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI not set, skipping database connection');
    return;
  }
  return mongoose.connect(uri);
}
