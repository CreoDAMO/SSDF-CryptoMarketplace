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
  const [dbStatus, setDbStatus] = useState<{ complete: boolean; role: string } | null>(null);

  useEffect(() => {
    async function checkDbStatus() {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/user/status?clerkId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data);
        }
      } catch (err) {
        console.error('Failed to check user status:', err);
      }
    }
    if (isLoaded && user) {
      checkDbStatus();
    }
  }, [isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !dbStatus) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    // Use DB status as the source of truth to avoid Clerk metadata propagation delays
    const isComplete = dbStatus.complete;
    const userRole = dbStatus.role;

    if (requiredRole === 'admin') {
      if (userRole !== 'admin') {
        router.push('/');
        return;
      }
    }

    // If we are already on the onboarding path, don't redirect if the DB says it's incomplete
    if (pathname && pathname.startsWith('/onboarding')) {
      if (isComplete) {
        router.push('/dashboard');
      }
      setIsChecking(false);
      return;
    }

    if (!isComplete) {
      router.push('/onboarding/buyer');
      return;
    }

    setIsChecking(false);
  }, [isLoaded, user, router, pathname, requiredRole, dbStatus]);

  if (!isLoaded || isChecking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
