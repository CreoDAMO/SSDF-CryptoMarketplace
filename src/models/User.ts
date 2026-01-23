// src/models/User.ts
import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  walletAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
  // Add from extensions if needed (e.g., onboardingCompletedAt: Date)
  onboardingCompletedAt: { type: Date },
  buyerOnboardingComplete: { type: Boolean, default: false },
  sellerOnboardingComplete: { type: Boolean, default: false },
  onboardingQuizLog: [{
    questionId: String,
    selectedAnswer: String,
    correct: Boolean,
    timestamp: Date
  }],
});

export const User = model('User', UserSchema);
