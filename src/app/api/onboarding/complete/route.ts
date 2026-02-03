import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { role } = body;
  if (!role || !['buyer', 'seller'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    if (user.publicMetadata.onboardingComplete) {
      return NextResponse.json({ success: true, message: 'Already complete' });
    }

    await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
        role,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Onboarding complete error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
