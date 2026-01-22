// /api/onboarding/quiz: POST - Validate + log
import { getAuth } from '@clerk/nextjs/server';
import { User } from '@/lib/models';
import { HLE_PHRASES } from '@/lib/hle-phrases';

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  const { qId, answer } = await req.json();
  const correct = answer === (HLE_PHRASES as any)[`${qId.toUpperCase()}_CORRECT`]; // Dynamic check
  
  if (userId) {
    await User.updateOne(
      { clerkId: userId }, 
      { $push: { onboardingQuizLog: { qId, selectedAnswer: answer, correct, timestamp: new Date() } } }
    );
  }
  
  return new Response(JSON.stringify({ correct }), { status: correct ? 200 : 400 });
}
