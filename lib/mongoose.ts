import mongoose from 'mongoose';

export async function connectToDB() {
  if (mongoose.connection.readyState >= 1) return; // Singleton
  return mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
}
