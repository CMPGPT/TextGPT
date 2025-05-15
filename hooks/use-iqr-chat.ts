"use client";

import { useState, useCallback, useEffect } from 'react';

// Types
export interface IQRMessage {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  metadata?: {
    function_call_used?: boolean;
    [key: string]: any;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  system_prompt?: string;
}

export interface Business {
  id: string;
  name: string;
  website_url?: string;
  support_email?: string;
  support_phone?: string;
}

export function useIQRChat(businessId: string) {
  const [messages, setMessages] = useState<IQRMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize anonymousId from sessionStorage on mount
  useEffect(() => {
    const storageKey = `iqr_anonymous_${businessId}`;
    const storedAnonymousId = sessionStorage.getItem(storageKey);
    
    if (storedAnonymousId) {
      setAnonymousId(storedAnonymousId);
    } else {
      // Generate a new ID and store it
      const newAnonymousId = crypto.randomUUID();
      sessionStorage.setItem(storageKey, newAnonymousId);
      setAnonymousId(newAnonymousId);
    }
  }, [businessId]);

  // Fetch business data, products and chat history when anonymousId is available
  useEffect(() => {
    if (anonymousId && !isInitialized) {
      fetchBusinessData();
      fetchBusinessProducts();
      fetchChatHistory();
      setIsInitialized(true);
    }
  }, [anonymousId, isInitialized]);

  // Fetch business information
  const fetchBusinessData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log(`[CLIENT] Fetching business data for business ID: ${businessId}`);
      const response = await fetch(`/api/iqr/products?businessId=${businessId}&businessInfo=true`);
      if (!response.ok) throw new Error('Failed to fetch business data');
      
      const data = await response.json();
      if (data.business) {
        console.log(`[CLIENT] Retrieved business data: ${data.business.name || 'Test Business'}`);
        
        // Ensure business name is always set
        if (data.business && !data.business.name) {
          data.business.name = 'Test Business';
        }
        
        setBusiness(data.business);
      }
    } catch (err) {
      console.error('[CLIENT] Error fetching business data:', err);
      setError('Failed to fetch business information');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  // Fetch products for the business
  const fetchBusinessProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log(`[CLIENT] Fetching products for business ID: ${businessId}`);
      const response = await fetch(`/api/iqr/products?businessId=${businessId}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      if (data.products) {
        console.log(`[CLIENT] Retrieved ${data.products.length} products`);
        setProducts(data.products);
      }
    } catch (err) {
      console.error('[CLIENT] Error fetching business products:', err);
      setError('Failed to fetch product information');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  // Fetch chat history for anonymous user
  const fetchChatHistory = useCallback(async () => {
    if (!anonymousId) return;
    
    try {
      setIsLoading(true);
      console.log(`[CLIENT] Fetching chat history for user: ${anonymousId}`);
      const response = await fetch(`/api/iqr/chat/history?anonymousId=${anonymousId}&businessId=${businessId}`);
      if (!response.ok) throw new Error('Failed to fetch chat history');
      
      const historyMessages = await response.json();
      
      if (historyMessages && historyMessages.length > 0) {
        console.log(`[CLIENT] Found ${historyMessages.length} messages in history`);
        // Filter out function messages and format
        const formattedMessages = historyMessages
          .filter((msg: any) => msg.role !== 'function')
          .map((msg: any) => ({
            role: msg.role as IQRMessage['role'],
            content: msg.content,
            metadata: msg.metadata || undefined,
          }));
        
        setMessages(formattedMessages);
      } else {
        console.log(`[CLIENT] No chat history found`);
      }
    } catch (err) {
      console.error('[CLIENT] Error fetching IQR chat history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [anonymousId, businessId]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  // Send a message programmatically
  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim()) return;

      // Add user message to the list
      const userMessage: IQRMessage = {
        role: 'user',
        content: messageText,
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setError(null);

      try {
        console.log(`[CLIENT] Sending message to API for business ${businessId}`);
        
        // Send the message to our API
        const response = await fetch('/api/iqr/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [userMessage],
            anonymous_id: anonymousId,
            business_id: businessId,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[CLIENT] API error (${response.status}):`, errorText); 
          throw new Error(`API error (${response.status}): ${errorText || 'No response details'}`);
        }

        // Get the assistant response and metadata (if available)
        const responseData = await response.text();
        console.log(`[CLIENT] Received response from API, length: ${responseData.length} chars`);
        
        // Check if there's metadata in the response headers
        const functionCallUsed = response.headers.get('X-Function-Call-Used') === 'true';
        
        // Add the assistant response to the list
        const assistantMessage: IQRMessage = {
          role: 'assistant',
          content: responseData,
          metadata: functionCallUsed ? { function_call_used: true } : undefined
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        console.error('[CLIENT] Error sending IQR message:', err);
        setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    },
    [anonymousId, businessId]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await sendMessage(input);
    },
    [input, sendMessage]
  );

  // Clear chat history
  const clearChatHistory = useCallback(async () => {
    if (!anonymousId) return;
    
    setIsLoading(true);
    try {
      console.log(`[CLIENT] Clearing chat history for user: ${anonymousId}`);
      const response = await fetch(`/api/iqr/chat/history?anonymousId=${anonymousId}&businessId=${businessId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      console.log(`[CLIENT] Chat history cleared successfully`);
      // Clear messages in state
      setMessages([]);
    } catch (err) {
      console.error('[CLIENT] Error clearing IQR chat history:', err);
      setError('Failed to clear chat history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [anonymousId, businessId]);

  return {
    messages,
    input,
    setInput,
    products,
    business,
    handleInputChange,
    handleSubmit,
    sendMessage,
    isLoading,
    error,
    clearChatHistory,
  };
} 