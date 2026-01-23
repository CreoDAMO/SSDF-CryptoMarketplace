import { authMiddleware } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { connectToDB } from '@/lib/mongoose'; // Your DB connector (adjust path if needed)
import User from '@/models/User'; // Extended schema (adjust path if needed)
import rateLimit from 'express-rate-limit'; // Add dep: yarn add express-rate-limit @types/express-rate-limit

// Rate limiter configuration (adapted for Next.js middleware)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Middleware function with Clerk auth, HLE gates, and rate limiting
export default authMiddleware({
  beforeAuth: async (req: NextRequest) => {
    // Apply rate limiter (adapt express-rate-limit for Next.js by manual invocation)
    const ip = req.ip || req.headers.get('x-forwarded-for')?.toString() || 'unknown';
    const limitResponse = await new Promise((resolve) => {
      limiter(req as any, {} as any, () => resolve(null)); // Mock res/next for limiter
    });
    if (limitResponse) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Connect to DB for HLE checks
    await connectToDB();

    const { userId } = req.auth || {}; // Clerk session (from authMiddleware)
    if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url));

    const user = await User.findOne({ clerkId: userId });
    if (!user) return NextResponse.redirect(new URL('/sign-up', req.url)); // Role select post-signup

    // Role-based HLE Gate
    const role = user.role; // 'buyer' | 'seller'
    const onboardingKey = `${role}OnboardingComplete` as keyof typeof user; // Dynamic flag
    if (!user[onboardingKey]) {
      return NextResponse.redirect(new URL(`/onboarding/${role}`, req.url));
    }

    // Protected routes example: /checkout requires buyer gate
    if (req.nextUrl.pathname.startsWith('/checkout') && role !== 'buyer') {
      return NextResponse.redirect(new URL('/dashboard', req.url)); // Role mismatch
    }
    // Similar for /listings (seller) or other protected paths
  },
});

// Config: Apply to all routes except static/auth
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
