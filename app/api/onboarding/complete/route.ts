import { getAuth } from '@clerk/nextjs/server';
import { User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { role } = await req.json();
  
  await User.updateOne(
    { clerkId: userId },
    {
      $set: {
        'onboarding.completed': true,
        'onboarding.completedAt': new Date(),
        'onboardingAttempts': 0,
        [`${role}OnboardingComplete`]: true,
        role: role
      }
    }
  );

  return NextResponse.json({ success: true });
}
