import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/onboarding(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();
  const pathname = request.nextUrl.pathname;

  // 1. Protect private routes
  if (!userId && !isPublicRoute(request)) {
    // If it's an API route and not authenticated, return 401 instead of redirecting to sign-in
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return redirectToSignIn({ returnBackUrl: request.url });
  }

  // 2. Handle onboarding redirect for logged-in users
  if (userId) {
    const onboardingComplete = (sessionClaims?.metadata as any)?.onboardingComplete;

    // If onboarding is incomplete and user isn't on an onboarding page or API, redirect to onboarding
    if (!onboardingComplete && !pathname.startsWith('/onboarding') && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/onboarding/buyer', request.url));
    }

    // If onboarding is complete and user is trying to access onboarding, redirect to dashboard
    if (onboardingComplete && pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
