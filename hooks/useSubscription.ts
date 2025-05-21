'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type SubscriptionStatus = {
  isLoading: boolean;
  isSubscribed: boolean;
  subscriptionStatus: string | null;
  error: Error | null;
};

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isLoading: true,
    isSubscribed: false,
    subscriptionStatus: null,
    error: null,
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkSubscription() {
      try {
        // Get current user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error('Authentication required');
        }
        
        // Get user's business ID
        const { data: userData, error: userError } = await supabase
          .from('iqr_users')
          .select('business_id')
          .eq('auth_uid', session.user.id)
          .single();
        
        if (userError || !userData) {
          throw new Error('User not found or not associated with a business');
        }
        
        // Get business subscription status
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('subscription_status')
          .eq('id', userData.business_id)
          .single();
        
        if (businessError || !businessData) {
          throw new Error('Business not found');
        }
        
        setStatus({
          isLoading: false,
          isSubscribed: businessData.subscription_status === 'active',
          subscriptionStatus: businessData.subscription_status,
          error: null,
        });
      } catch (error) {
        setStatus({
          isLoading: false,
          isSubscribed: false,
          subscriptionStatus: null,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    }
    
    checkSubscription();
  }, [supabase, router]);

  const redirectToPlans = () => {
    router.push('/subscription/plans');
  };

  return {
    ...status,
    redirectToPlans,
  };
} 