'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface OnboardingGuardProps {
  children: React.ReactNode;
  requiredRole?: 'buyer' | 'seller' | 'admin';
}

export default function OnboardingGuard({ children, requiredRole }: OnboardingGuardProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const metadata = user.publicMetadata as {
      onboardingComplete?: boolean;
      buyerOnboardingComplete?: boolean;
      sellerOnboardingComplete?: boolean;
      role?: string;
    };

    const isBuyerComplete = metadata.buyerOnboardingComplete;
    const isSellerComplete = metadata.sellerOnboardingComplete;
    const userRole = metadata.role as string;

    if (requiredRole === 'admin') {
      if (userRole !== 'admin') {
        router.push('/');
        return;
      }
    }

    if (requiredRole === 'seller' && !isSellerComplete) {
      router.push('/onboarding/seller');
      return;
    }

    if (requiredRole === 'buyer' && !isBuyerComplete) {
      router.push('/onboarding/buyer');
      return;
    }

    if (!isBuyerComplete && !isSellerComplete && pathname && !pathname.startsWith('/onboarding')) {
      router.push('/onboarding/buyer');
      return;
    }

    setIsChecking(false);
  }, [isLoaded, user, router, pathname, requiredRole]);

  if (!isLoaded || isChecking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
