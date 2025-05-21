'use client';

import { useEffect, useState } from 'react';
import { IQRChat } from '@/components/iqr/IQRChat';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface ChatPageClientProps {
  params: {
    businessId: string;
  };
}

export function ChatPageClient({ params }: ChatPageClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_businessExists, setBusinessExists] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = params.businessId;

  useEffect(() => {
    async function checkBusinessExists() {
      try {
        setLoading(true);
        
        const supabase = createClient();
        const { data, error } = await supabase
          .from('businesses')
          .select('id')
          .eq('id', businessId)
          .single();
        
        if (error || !data) {
          console.error('Business not found:', businessId);
          setError(`The business you're looking for doesn't exist`);
          
          // Redirect to chat page with error parameter
          router.push(`/iqr/chat?error=business_not_found&id=${businessId}`);
          return;
        }
        
        setBusinessExists(true);
      } catch (err) {
        console.error('Error checking business:', err);
        setError('An error occurred while checking business');
      } finally {
        setLoading(false);
      }
    }

    // Check for sent parameter in the URL
    const sentParam = searchParams.get('sent');
    if (sentParam) {
      try {
        // Handle any query format, not just "_describe"
        const decodedParam = decodeURIComponent(sentParam);
        
        // More carefully replace URL-friendly formatting with spaces for readability
        // Without accidentally removing % characters that might be part of valid URL encoding
        const formattedMessage = decodedParam
          .replace(/_/g, ' ') // Replace underscores with spaces
          .replace(/%20/g, ' '); // Replace URL-encoded spaces with actual spaces
        
        setInitialMessage(formattedMessage);
        console.log('Set initial message from URL param:', formattedMessage);
      } catch (err) {
        console.error('Error parsing sent parameter:', err, sentParam);
      }
    }

    checkBusinessExists();
  }, [businessId, router, searchParams]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-iqr-100 text-iqr-400">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-iqr-200" />
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Will redirect, this prevents flash of content
  }

  return (
    <main className="flex flex-col h-screen w-full bg-iqr-100 text-iqr-400 overflow-hidden">
      <IQRChat businessId={businessId} initialMessage={initialMessage} />
    </main>
  );
} 