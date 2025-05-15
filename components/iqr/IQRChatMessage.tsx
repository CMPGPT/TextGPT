"use client";

import { IQRMessage } from '@/hooks/use-iqr-chat';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Info, FileBox, Box } from 'lucide-react';

interface IQRChatMessageProps {
  message: IQRMessage;
}

export function IQRChatMessage({ message }: IQRChatMessageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isUser = message.role === 'user';
  const containsProductInfo = message.metadata?.function_call_used || message.content.includes('specifications') || message.content.includes('features');

  useEffect(() => {
    // Simple fade-in effect
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, isUser ? 0 : 100); // No delay for user messages, slight delay for assistant

    return () => clearTimeout(timer);
  }, [message.content, isUser]);

  // Function to detect if the message is showing product specifications
  const renderMessageContent = () => {
    if (!containsProductInfo) {
      return (
        <p className="whitespace-pre-wrap break-words text-sm md:text-base">
          {message.content}
        </p>
      );
    }

    // Enhance display for product information
    return (
      <div>
        <p className="whitespace-pre-wrap break-words text-sm md:text-base">
          {message.content}
        </p>
        
        {message.metadata?.function_call_used && (
          <div className="mt-2 flex items-center text-xs text-iqr-50/80">
            <Info className="h-3 w-3 mr-1" />
            <span>Product information retrieved from our database</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex w-full py-4 px-4 md:px-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-[85%] md:max-w-[75%] transition-opacity duration-300",
          isUser
            ? "bg-iqr-200 text-iqr-50"
            : containsProductInfo 
              ? "bg-iqr-300 text-iqr-50 border border-iqr-50/20" 
              : "bg-iqr-300/90 text-iqr-50",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        {renderMessageContent()}
      </div>
    </div>
  );
} 