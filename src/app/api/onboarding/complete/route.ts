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
  const allowedRoles = ['buyer', 'seller'] as const;
  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    await connectToDB();

    // Idempotent: Check Mongo first (source of truth)
    const existingUser = await User.findOne({ clerkId: userId });
    if (existingUser?.onboarding?.completed) {
      return NextResponse.json({ success: true, message: 'Already complete' });
    }

    // Update Mongo (Upsert for new users)
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

    // Sync to Clerk (For fast guards/metadata)
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    if (clerkUser.publicMetadata.onboardingComplete) {
      return NextResponse.json({ success: true, message: 'Already complete' });
    }

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
