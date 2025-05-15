"use client";

import { useState, useRef, useEffect } from 'react';
import { useIQRChat, IQRMessage } from '@/hooks/use-iqr-chat';
import { IQRChatMessage } from './IQRChatMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ShoppingBag } from 'lucide-react';

interface IQRChatProps {
  businessId: string;
  initialMessage?: string | null;
}

export function IQRChat({ businessId, initialMessage }: IQRChatProps) {
  const {
    messages,
    input,
    business,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setInput,
    sendMessage
  } = useIQRChat(businessId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  
  // Validate business ID
  if (!businessId) {
    console.error('No business ID provided to IQRChat component');
  }
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle initial message if provided
  useEffect(() => {
    if (initialMessage && !initialMessageSent && !isLoading) {
      // Set the input field with the initial message
      setInput(initialMessage);
      setInitialMessageSent(true);
      
      // Auto-send the message after a short delay
      const timer = setTimeout(() => {
        sendMessage(initialMessage);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [initialMessage, initialMessageSent, isLoading, setInput, sendMessage]);

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto relative">
      {/* Header - Fixed at top */}
      <div className="sticky top-0 z-10 flex items-center justify-between py-3 sm:py-4 px-3 sm:px-4 border-b border-iqr-200/30 text-iqr-400 bg-iqr-100">
        <div className="flex items-center space-x-2">
          <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-iqr-200" />
          <h1 className="text-lg sm:text-xl font-bold text-iqr-400">IQR.code</h1>
        </div>
        
        <div className="text-xs sm:text-sm text-iqr-300">
          {business ? business.name : 'Product Chat'}
        </div>
      </div>

      {/* Message Container - Scrollable area with flex-grow */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 text-iqr-400 pb-24 sm:pb-28">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-xl font-semibold mb-2 text-iqr-400">Welcome to Product Chat</h2>
            <p className="max-w-md text-iqr-300">
              Start a conversation with our virtual assistant to learn more about
              {business ? ` ${business.name}'s products` : ' our products'}.
            </p>
            {business && (
              <div className="mt-6 bg-iqr-100/70 border border-iqr-200/30 rounded-lg p-4 max-w-md">
                <h3 className="font-semibold text-iqr-200 mb-2">{business.name}</h3>
                <p className="text-iqr-300 text-sm">Ask me about our products!</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {messages.map((message: IQRMessage, index: number) => (
              <IQRChatMessage key={index} message={message} />
            ))}
          </div>
        )}
        
        {/* Show error message if any */}
        {error && (
          <div className="p-3 bg-red-100/20 text-red-400 rounded-lg mx-auto max-w-md border border-red-300/20">
            {error}
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Container - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-4xl mx-auto w-full border-t border-iqr-200/30 p-3 sm:p-4 bg-iqr-100">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about our products..."
            disabled={isLoading}
            className="flex-1 bg-iqr-100/70 border-iqr-200/30 text-iqr-400 focus-visible:ring-iqr-200 placeholder:text-iqr-300/50 h-10 text-sm sm:text-base sm:h-11"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-iqr-200 text-black hover:bg-iqr-200/80 h-10 sm:h-11"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
} 