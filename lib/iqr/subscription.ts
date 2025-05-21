import { createClient } from '@/lib/supabase/client';

/**
 * Check if a business has an active subscription
 */
export async function hasActiveSubscription(businessId: string): Promise<boolean> {
  try {
    if (!businessId) return false;
    
    const supabase = createClient();
    
    // Check subscription status in businesses table
    const { data, error } = await supabase
      .from('businesses')
      .select('subscription_status')
      .eq('id', businessId)
      .single();
    
    if (error || !data) {
      console.error('Error checking subscription status:', error);
      return false;
    }
    
    return data.subscription_status === 'active';
  } catch (error) {
    console.error('Error in hasActiveSubscription:', error);
    return false;
  }
}

/**
 * Get business ID for a user
 */
export async function getBusinessIdForUser(userId: string): Promise<string | null> {
  try {
    if (!userId) return null;
    
    const supabase = createClient();
    
    // Get business ID from iqr_users table
    const { data, error } = await supabase
      .from('iqr_users')
      .select('business_id')
      .eq('auth_uid', userId)
      .single();
    
    if (error || !data) {
      console.error('Error getting business ID for user:', error);
      return null;
    }
    
    return data.business_id;
  } catch (error) {
    console.error('Error in getBusinessIdForUser:', error);
    return null;
  }
}

/**
 * Check if the current user needs to subscribe
 * Returns true if they need to subscribe (don't have an active subscription)
 */
export async function needsSubscription(userId: string): Promise<boolean> {
  try {
    // Get business ID for user
    const businessId = await getBusinessIdForUser(userId);
    if (!businessId) return true;
    
    // Check if business has active subscription
    const hasSubscription = await hasActiveSubscription(businessId);
    return !hasSubscription;
  } catch (error) {
    console.error('Error checking if user needs subscription:', error);
    return true; // Default to requiring subscription if there's an error
  }
}

/**
 * Server action to get subscription status
 */
export async function getSubscriptionStatus(userId: string) {
  'use server';
  
  try {
    const businessId = await getBusinessIdForUser(userId);
    if (!businessId) {
      return {
        status: 'inactive',
        needsSubscription: true,
      };
    }
    
    const supabase = createClient();
    
    // Get business subscription data
    const { data, error } = await supabase
      .from('businesses')
      .select('subscription_status, stripe_customer_id')
      .eq('id', businessId)
      .single();
    
    if (error || !data) {
      console.error('Error getting business subscription data:', error);
      return {
        status: 'inactive',
        needsSubscription: true,
      };
    }
    
    return {
      status: data.subscription_status,
      hasActiveSubscription: data.subscription_status === 'active',
      needsSubscription: data.subscription_status !== 'active',
      stripeCustomerId: data.stripe_customer_id,
    };
  } catch (error) {
    console.error('Error in getSubscriptionStatus:', error);
    return {
      status: 'error',
      needsSubscription: true,
      error: 'Failed to check subscription status',
    };
  }
} 