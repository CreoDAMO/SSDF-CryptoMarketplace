import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDB } from '@/lib/mongoose';
import { User } from '@/lib/models';

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { role } = body;
  if (!role || !['buyer', 'seller'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    await connectToDB();
    
    // Update MongoDB (Source of Truth)
    await User.findOneAndUpdate(
      { clerkId: userId },
      { 
        $set: { 
          onboardingComplete: true, 
          role,
          buyerOnboardingComplete: role === 'buyer',
          sellerOnboardingComplete: role === 'seller',
          'onboarding.completed': true,
          'onboarding.completedAt': new Date()
        } 
      },
      { upsert: true }
    );

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    if (user.publicMetadata.onboardingComplete) {
      return NextResponse.json({ success: true, message: 'Already complete' });
    }

    // Update Clerk (UX/Role metadata)
    await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
        role,
        buyerOnboardingComplete: role === 'buyer',
        sellerOnboardingComplete: role === 'seller',
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Onboarding complete error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
