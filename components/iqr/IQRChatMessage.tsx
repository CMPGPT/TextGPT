"use client";

import { IQRMessage } from '@/hooks/use-iqr-chat';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Info, FileBox, Box } from 'lucide-react';

interface IQRChatMessageProps {
  message: IQRMessage;
}

export function IQRChatMessage({ message }: IQRChatMessageProps) {
  const [displayedMessage, setDisplayedMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const isUser = message.role === 'user';
  const containsProductInfo = message.metadata?.function_call_used || message.content.includes('specifications') || message.content.includes('features');

  useEffect(() => {
    if (isUser) {
      setDisplayedMessage(message.content);
      setIsComplete(true);
      return;
    }

    // Simple typewriter effect for assistant messages
    let index = 0;
    const content = message.content;
    const timer = setInterval(() => {
      if (index < content.length) {
        setDisplayedMessage(prev => prev + content.charAt(index));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
      }
    }, 10); // Speed of typewriter effect

    return () => clearInterval(timer);
  }, [message.content, isUser]);

  // Function to detect if the message is showing product specifications
  const renderMessageContent = () => {
    if (!containsProductInfo) {
      return (
        <p className="whitespace-pre-wrap break-words text-sm md:text-base">
          {displayedMessage}
          {!isComplete && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-iqr-50 animate-pulse" />
          )}
        </p>
      );
    }

    // Enhance display for product information
    return (
      <div>
        <p className="whitespace-pre-wrap break-words text-sm md:text-base">
          {displayedMessage}
          {!isComplete && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-iqr-50 animate-pulse" />
          )}
        </p>
        
        {isComplete && message.metadata?.function_call_used && (
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
          "rounded-lg px-4 py-2 max-w-[85%] md:max-w-[75%]",
          isUser
            ? "bg-iqr-200 text-iqr-50"
            : containsProductInfo 
              ? "bg-iqr-300 text-iqr-50 border border-iqr-50/20" 
              : "bg-iqr-300/90 text-iqr-50"
        )}
      >
        {renderMessageContent()}
      </div>
    </div>
  );
} 