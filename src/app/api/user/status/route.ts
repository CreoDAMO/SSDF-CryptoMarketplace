import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/models';
import { connectToDB } from '@/lib/mongoose';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get('clerkId');

    if (!clerkId) {
      return NextResponse.json({ error: 'clerkId is required' }, { status: 400 });
    }

    await connectToDB();
    const user = await User.findOne({ clerkId });

    if (!user) {
      return NextResponse.json({ complete: false, role: 'buyer' });
    }

    return NextResponse.json({
      complete: user.onboardingComplete || user.onboarding?.completed || false,
      role: user.role || 'buyer'
    });
  } catch (error) {
    console.error('User status fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch user status' }, { status: 500 });
  }
}
