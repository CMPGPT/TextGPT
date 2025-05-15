"use client";

import { useState, useRef, useEffect } from 'react';
import { useIQRChat, IQRMessage } from '@/hooks/use-iqr-chat';
import { IQRChatMessage } from './IQRChatMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ShoppingBag } from 'lucide-react';

interface IQRChatProps {
  businessId: string;
}

export function IQRChat({ businessId }: IQRChatProps) {
  const {
    messages,
    input,
    business,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useIQRChat(businessId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Validate business ID
  if (!businessId) {
    console.error('No business ID provided to IQRChat component');
  }
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen w-full max-w-4xl mx-auto">
      {/* Header - Fixed at top */}
      <div className="flex items-center justify-between py-4 px-4 border-b border-iqr-200/30 text-iqr-400 bg-iqr-100">
        <div className="flex items-center space-x-2">
          <ShoppingBag className="h-6 w-6 text-iqr-200" />
          <h1 className="text-xl font-bold text-iqr-400">IQR.code</h1>
        </div>
        
        <div className="text-sm text-iqr-300">
          {business ? business.name : 'Product Chat'}
        </div>
      </div>

      {/* Message Container - Scrollable area with flex-grow */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-iqr-400">
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
      <div className="border-t border-iqr-200/30 p-4 bg-iqr-100">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about our products..."
            disabled={isLoading}
            className="flex-1 bg-iqr-100/70 border-iqr-200/30 text-iqr-400 focus-visible:ring-iqr-200 placeholder:text-iqr-300/50"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-iqr-200 hover:bg-iqr-200/80 text-iqr-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
} 