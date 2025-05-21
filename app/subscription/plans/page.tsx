'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getStripePromise } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/client';
import { loadStripe } from '@stripe/stripe-js';
import { AuthModal } from '@/components/subscription/AuthModal';

// Define the features of the product
const PRODUCT_FEATURES = [
  { name: 'Unlimited products creation', included: true },
  { name: 'Toll-free number', included: true },
  { name: 'Unlimited chat with customers', included: true },
  { name: 'Customizable QR codes', included: true },
  { name: 'PDF submissions for product creation', included: true },
  { name: 'Message logs with customer engagement analytics', included: true },
];

// Define the product
const PRODUCT = {
  id: 'prod_SKUcmFulvJlPM6',
  name: 'IQR.code Subscription',
  description: 'Professional QR code management subscription',
  priceId: 'price_1RPpzYQmAqUquWOhbM9iR9IP',
  amount: 999, // $9.99
  currency: 'usd',
  interval: 'month',
  features: PRODUCT_FEATURES
};

export default function SubscriptionPlansPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  // Initialize Stripe on component mount
  useEffect(() => {
    // Initialize Stripe
    const initializeStripe = async () => {
      try {
        const publishableKey = 'pk_test_51RPMfvQmAqUquWOh6mQ3Yxj6a7NsZyI0BqIQMWWO2eLRtbLRKNQPOKKD1OeLuxUwN0KqCqKzfNyKKMmNdW29d5b300rUi2S2Fy';
        const stripePromise = loadStripe(publishableKey);
        setStripePromise(stripePromise);
      } catch (error) {
        console.error('Error initializing Stripe:', error);
      }
    };
    
    initializeStripe();
  }, []);

  // Check if user is authenticated
  useEffect(() => {
    async function checkUserAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        setAuthToken(session.access_token);
      } else {
        setUser(null);
        setAuthToken(null);
      }
    }
    
    checkUserAuth();
    
    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthToken(session?.access_token || null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleSubscribe = async () => {
    // If user is not authenticated, show auth modal
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    try {
      if (!authToken) {
        setError('You must be logged in to subscribe');
        return;
      }
      
      if (!stripePromise) {
        setError('Stripe is not initialized');
        return;
      }
      
      setIsProcessing(true);
      console.log('Starting subscription process...');
      
      // Create a FormData object with the price ID
      const formData = new FormData();
      formData.append('priceId', PRODUCT.priceId);
      
      console.log('Sending request to /api/iqr-subscription with price ID:', PRODUCT.priceId);
      
      // Make the API call
      const response = await fetch('/api/iqr-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
        },
        body: formData,
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      // Parse the JSON response
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.url) {
        console.log('Redirecting to Stripe checkout URL:', data.url);
        
        // Directly set window location instead of going through Stripe.js
        window.location.href = data.url;
      } else if (data.sessionId) {
        // If we have the session ID, redirect using Stripe.js
        console.log('Redirecting to checkout with session ID:', data.sessionId);
        const stripe = await stripePromise;
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        
        if (error) {
          throw new Error(error.message);
        }
      } else {
        throw new Error('No checkout URL or session ID returned from server');
      }
    } catch (err: any) {
      console.error('Error subscribing to plan:', err);
      setError(`Failed to process subscription: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-500">{error}</p>
          <div className="mt-4">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  // Format price for display
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: PRODUCT.currency,
    minimumFractionDigits: 2
  }).format(PRODUCT.amount / 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4">
      <div className="text-center max-w-3xl mb-8">
        <h1 className="text-3xl font-bold mb-4">IQR.code Subscription</h1>
        <p className="text-muted-foreground">
          Get access to all our premium features and manage your products efficiently
        </p>
      </div>
      
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>{PRODUCT.name}</CardTitle>
          <CardDescription>{PRODUCT.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-center">
            <span className="text-3xl font-bold">{formattedPrice}</span>
            <span className="text-muted-foreground">/{PRODUCT.interval}</span>
          </div>
          <ul className="space-y-2">
            {PRODUCT.features.map((feature, i) => (
              <li key={i} className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                <span>{feature.name}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleSubscribe}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Subscribe Now'}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal} 
        returnUrl="/subscription/plans"
      />
    </div>
  );
} 