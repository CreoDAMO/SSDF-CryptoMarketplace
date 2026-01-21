// /api/onboarding/quiz: POST - Validate + log
import { getAuth } from '@clerk/nextjs/server';
import User from '@/models/User';

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  const { qId, answer } = await req.json();
  const correct = answer === HLE_PHRASES[`${qId.toUpperCase()}_CORRECT`]; // Dynamic check
  await User.updateOne({ clerkId: userId }, { $push: { onboardingQuizLog: { qId, selectedAnswer: answer, correct, timestamp: new Date() } } });
  return new Response(JSON.stringify({ correct }), { status: correct ? 200 : 400 });
}
