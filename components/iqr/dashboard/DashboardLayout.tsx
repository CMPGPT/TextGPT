'use client';

import { ReactNode } from 'react';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Subscription fallback UI
  const SubscriptionFallback = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <h2 className="text-2xl font-bold mb-4">Subscription Required</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        You need an active subscription to access this feature. Please subscribe to a plan to continue.
      </p>
      <Button asChild variant="default">
        <Link href="/subscription/plans">View Subscription Plans</Link>
      </Button>
    </div>
  );

  return (
    <SubscriptionGuard fallback={<SubscriptionFallback />}>
      {children}
    </SubscriptionGuard>
  );
} 