'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SubscriptionSuccessPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [processingTimeout, setProcessingTimeout] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Processing your subscription...');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const supabase = createClient();
  
  const MAX_ATTEMPTS = 15; // Try for about 30 seconds (15 attempts * 2 second intervals)
  
  // Get the auth token on component mount
  useEffect(() => {
    async function getAuthToken() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You must be logged in to view subscription details');
        setIsLoading(false);
        return;
      }
      
      setAuthToken(session.access_token);
    }
    
    getAuthToken();
  }, [supabase]);
  
  useEffect(() => {
    if (!sessionId) {
      setError('Invalid checkout session');
      setIsLoading(false);
      return;
    }
    
    if (!authToken) {
      // Wait for auth token to be set
      return;
    }
    
    // Set a global timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setProcessingTimeout(true);
        setIsLoading(false);
      }
    }, 40000); // 40 seconds
    
    async function verifySubscription() {
      try {
        // Update message based on attempt count
        if (attempts > 0) {
          setStatusMessage(`Verifying subscription status (attempt ${attempts + 1}/${MAX_ATTEMPTS})...`);
        }
        
        // Get the subscription status, passing the session ID
        const response = await fetch(`/api/iqr-subscription?session_id=${sessionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to verify subscription');
        }
        
        const data = await response.json();
        console.log('Subscription check response:', data);
        
        // Check if we have an active subscription
        if (data.has_active_subscription) {
          console.log('Subscription is active, redirecting to dashboard');
          setIsLoading(false);
          return;
        }
        
        // Check if subscription is still processing
        if (data.is_processing && attempts < MAX_ATTEMPTS) {
          // Wait and try again
          console.log(`Subscription still processing, retrying (${attempts + 1}/${MAX_ATTEMPTS})...`);
          setAttempts(prev => prev + 1);
          setTimeout(verifySubscription, 2000);
          return;
        }
        
        // If we've reached max attempts or not processing anymore but not active
        if (attempts >= MAX_ATTEMPTS || !data.is_processing) {
          console.log('Max attempts reached or subscription not processing but not active');
          setProcessingTimeout(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error verifying subscription:', err);
        setError('Failed to verify subscription status');
        setIsLoading(false);
      }
    }
    
    verifySubscription();
    
    // Clear timeout on cleanup
    return () => {
      clearTimeout(timeoutId);
    };
  }, [sessionId, authToken, attempts, isLoading]);
  
  const handleGoToDashboard = () => {
    router.push('/iqr/dashboard');
  };
  
  const handleRetry = () => {
    setIsLoading(true);
    setAttempts(0);
    setProcessingTimeout(false);
    setError(null);
    setStatusMessage('Retrying subscription verification...');
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4">
        <h1 className="text-3xl font-bold mb-4">Processing Your Subscription</h1>
        <p className="text-muted-foreground mb-8">
          {statusMessage}
        </p>
        <div className="flex justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4">
        <h1 className="text-3xl font-bold mb-4">Something Went Wrong</h1>
        <p className="text-red-500 mb-8">{error}</p>
        <Button onClick={() => router.push('/subscription/plans')}>
          Try Again
        </Button>
      </div>
    );
  }
  
  if (processingTimeout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4">
        <div className="max-w-xl text-center">
          <div className="flex justify-center mb-6">
            <AlertTriangle className="h-16 w-16 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Subscription Being Processed</h1>
          <p className="text-muted-foreground mb-4">
            Your subscription is being processed, but it's taking longer than expected. 
            This can happen due to payment processing delays.
          </p>
          <p className="text-muted-foreground mb-8">
            You can continue to the dashboard where your subscription status will be updated automatically once processed.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button variant="outline" onClick={handleRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Check Again
            </Button>
            <Button onClick={handleGoToDashboard}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4">
      <div className="max-w-xl text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Subscription Activated!</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for subscribing to IQR.code. Your subscription is now active, and you have full access to all features.
        </p>
        <Button size="lg" onClick={handleGoToDashboard}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
} 