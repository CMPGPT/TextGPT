"use client";

import { loadStripe as importLoadStripe } from '@stripe/stripe-js';

// Client-side utilities for Stripe

// Get subscription plans from the API
export async function getSubscriptionPlans() {
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/iqr/stripe/products?_=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch subscription plans');
    }
    
    console.log('Client-side received subscription plans:', data.products);
    return data.products;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return [];
  }
}

// Create checkout session
export async function createCheckout({
  priceId,
  email,
  mode = 'subscription'
}: {
  priceId: string;
  email: string;
  mode?: 'subscription' | 'payment';
}) {
  try {
    const response = await fetch('/api/iqr/stripe/checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        email,
        mode,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating checkout:', error);
    throw error;
  }
}

// Initialize Stripe client (when needed)
export function getStripePromise() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!key) {
    console.error('Stripe publishable key is missing');
    return null;
  }
  
  return importLoadStripe(key);
}

/**
 * Get subscription status for a customer
 */
export async function getSubscriptionStatus(customerId: string) {
  try {
    const response = await fetch(`/api/iqr/stripe/subscription-status?customerId=${customerId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get subscription status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting subscription status:', error);
    throw error;
  }
} 