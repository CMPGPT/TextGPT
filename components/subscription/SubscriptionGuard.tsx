'use client';

import { ReactNode, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';

type SubscriptionGuardProps = {
  children: ReactNode;
  fallback?: ReactNode;
  redirectToPlans?: boolean;
};

/**
 * A component that guards content based on subscription status
 * If the user doesn't have an active subscription, it can either:
 * 1. Redirect to plans page
 * 2. Show a fallback component
 * 3. Show nothing
 */
export default function SubscriptionGuard({
  children,
  fallback,
  redirectToPlans = true,
}: SubscriptionGuardProps) {
  const { isLoading, isSubscribed, error } = useSubscription();
  const router = useRouter();
  
  useEffect(() => {
    // If we're done loading, not subscribed, and should redirect
    if (!isLoading && !isSubscribed && redirectToPlans) {
      router.push('/subscription/plans');
    }
  }, [isLoading, isSubscribed, redirectToPlans, router]);
  
  // Show loading state (or nothing)
  if (isLoading) {
    return null;
  }
  
  // If not subscribed and we have a fallback, show it
  if (!isSubscribed && fallback) {
    return <>{fallback}</>;
  }
  
  // If not subscribed and no fallback, show nothing
  if (!isSubscribed) {
    return null;
  }
  
  // Otherwise, show the children
  return <>{children}</>;
} 