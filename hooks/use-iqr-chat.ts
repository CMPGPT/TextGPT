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

export function useIQRChat(businessId: string) {
  const [messages, setMessages] = useState<IQRMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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

  // Fetch products for the business and chat history when anonymousId is available
  useEffect(() => {
    if (anonymousId && !isInitialized) {
      fetchBusinessProducts();
      fetchChatHistory();
      setIsInitialized(true);
    }
  }, [anonymousId, isInitialized]);

  // Fetch products for the business
  const fetchBusinessProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/iqr/products?businessId=${businessId}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      setProducts(data);
      
      // Set the first product as selected by default if available
      if (data.length > 0) {
        setSelectedProduct(data[0]);
      }
    } catch (err) {
      console.error('Error fetching business products:', err);
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
      const response = await fetch(`/api/iqr/chat/history?anonymousId=${anonymousId}&businessId=${businessId}`);
      if (!response.ok) throw new Error('Failed to fetch chat history');
      
      const historyMessages = await response.json();
      
      if (historyMessages && historyMessages.length > 0) {
        // Filter out function messages and format
        const formattedMessages = historyMessages
          .filter((msg: any) => msg.role !== 'function')
          .map((msg: any) => ({
            role: msg.role as IQRMessage['role'],
            content: msg.content,
            metadata: msg.metadata || undefined,
          }));
        
        setMessages(formattedMessages);
      }
    } catch (err) {
      console.error('Error fetching IQR chat history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [anonymousId, businessId]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  // Handle product selection
  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || !selectedProduct) return;

      // Add user message to the list
      const userMessage: IQRMessage = {
        role: 'user',
        content: input,
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setError(null);

      try {
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
            product_id: selectedProduct.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        // Get the assistant response and metadata (if available)
        const responseData = await response.text();
        
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
        console.error('Error sending IQR message:', err);
        setError('Failed to send message. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [input, anonymousId, businessId, selectedProduct]
  );

  // Clear chat history
  const clearChatHistory = useCallback(async () => {
    if (!anonymousId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/iqr/chat/history?anonymousId=${anonymousId}&businessId=${businessId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      // Clear messages in state
      setMessages([]);
    } catch (err) {
      console.error('Error clearing IQR chat history:', err);
      setError('Failed to clear chat history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [anonymousId, businessId]);

  return {
    messages,
    input,
    products,
    selectedProduct,
    handleInputChange,
    handleProductSelect,
    handleSubmit,
    isLoading,
    error,
    clearChatHistory,
  };
} 