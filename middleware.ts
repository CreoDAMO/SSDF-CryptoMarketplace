import { authMiddleware } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongoose'; // Your DB connector
import User from '@/models/User'; // Extended schema

export default authMiddleware({
  beforeAuth: async (req) => {
    await connectToDB();
    const { userId } = req.auth || {}; // Clerk session
    if (!userId) return NextResponse.redirect('/sign-in');

    const user = await User.findOne({ clerkId: userId });
    if (!user) return NextResponse.redirect('/sign-up'); // Role select post-signup

    // Role-based HLE Gate
    const role = user.role; // 'buyer' | 'seller'
    const onboardingKey = `${role}OnboardingComplete` as keyof typeof user; // Dynamic flag
    if (!user[onboardingKey]) {
      return NextResponse.redirect(`/onboarding/${role}`);
    }

    // Protected routes: e.g., /checkout requires buyer gate
    if (req.nextUrl.pathname.startsWith('/checkout') && role !== 'buyer') {
      return NextResponse.redirect('/dashboard'); // Role mismatch
    }
    // Similar for /listings (seller)
  },
});

// Config: Apply to all routes except static/auth
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|sign-in|sign-up).*)'] };
