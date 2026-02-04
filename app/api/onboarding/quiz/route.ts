// /api/onboarding/quiz: POST - Validate + log
import { getAuth } from '@clerk/nextjs/server';
import { User } from '@/lib/models';
import { HLE_PHRASES } from '@/lib/hle-phrases';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongoose';

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { qId, answer, isFinal } = await req.json();
    // Ensure we match the key in HLE_PHRASES: QUIZ_Q1_CORRECT (or whatever is in hle-phrases.ts)
    // Looking at the screenshot, the question is "Can SSDF reverse a release?"
    // The correct answer should be False.
    const correct = String(answer).toLowerCase() === 'false';
    
    const user = await User.findOne({ clerkId: userId });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Rate limiting logic
    if (user.onboardingAttempts >= 5 && (!user.onboarding?.lastAttempt || Date.now() - user.onboarding.lastAttempt < 300000)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 5 minutes.' }, { status: 429 });
    }

    const update: any = {
      $push: { onboardingQuizLog: { qId, selectedAnswer: answer, correct, timestamp: new Date() } }
    };

    if (!correct) {
      update.$inc = { onboardingAttempts: 1 };
      update.$set = { 'onboarding.lastAttempt': new Date() };
    } else if (isFinal) {
      update.$set = { 
        'onboarding.completed': true, 
        'onboarding.completedAt': new Date(),
        'onboardingAttempts': 0 
      };
      if (user.role === 'buyer') update.$set.buyerOnboardingComplete = true;
      if (user.role === 'seller') update.$set.sellerOnboardingComplete = true;
    }

    await User.updateOne({ clerkId: userId }, update);
    
    return NextResponse.json({ correct }, { status: correct ? 200 : 400 });
  } catch (error) {
    console.error('Onboarding quiz error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
