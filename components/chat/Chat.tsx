"use client";

import { useState, useRef, useEffect } from 'react';
import { useChat, Message } from '@/hooks/use-chat';
import { ChatMessage } from './ChatMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Trash2 } from 'lucide-react';

export function Chat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    currentPersona,
    clearChatHistory,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle clearing chat with confirmation
  const handleClearChat = () => {
    if (isConfirmingClear) {
      clearChatHistory();
      setIsConfirmingClear(false);
    } else {
      setIsConfirmingClear(true);
      // Auto-reset confirmation after 5 seconds
      setTimeout(() => setIsConfirmingClear(false), 5000);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="w-full mx-auto max-w-2xl flex flex-col h-full">
        {/* Header - Fixed at top */}
        <div className="sticky top-0 z-10 flex items-center justify-between py-3 sm:py-4 border-b border-textgpt-100/30 bg-gradient-to-r from-textgpt-200 to-textgpt-100 text-white rounded-t-lg">
          <div className="flex items-center space-x-2 px-3 sm:px-4">
            <h1 className="text-lg sm:text-xl font-bold text-white">TextGPT Chat</h1>
            {currentPersona && (
              <span className="bg-textgpt-300 text-textgpt-200 px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium">
                {currentPersona.name}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className={isConfirmingClear 
              ? "bg-red-100 hover:bg-red-200 text-red-600 mr-3 sm:mr-4" 
              : "text-white hover:bg-textgpt-100/20 mr-3 sm:mr-4"}
          >
            <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{isConfirmingClear ? "Confirm clear?" : "Clear chat"}</span>
            <span className="sm:hidden">{isConfirmingClear ? "Confirm?" : "Clear"}</span>
          </Button>
        </div>

        {/* Message Container - Scrollable area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 bg-gradient-to-b from-textgpt-50/10 to-white pb-24 sm:pb-28">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-2 text-textgpt-200">Welcome to TextGPT</h2>
              <p className="max-w-md text-textgpt-200">
                Start a conversation with the AI assistant. You can ask questions,
                request information, or just chat!
              </p>
              {currentPersona && (
                <p className="mt-4 text-sm text-textgpt-200">
                  Currently using: <span className="font-semibold text-textgpt-100">{currentPersona.name}</span>
                  {currentPersona.short_desc && (
                    <span className="block mt-1">{currentPersona.short_desc}</span>
                  )}
                </p>
              )}
              <p className="mt-6 text-xs text-textgpt-200">
                Try asking about &quot;available personas&quot; or &quot;switch to [persona name]&quot;
                to change the assistant&apos;s personality!
              </p>
            </div>
          ) : (
            <div className="flex-1 px-2 sm:px-3">
              {messages.map((message: Message, index: number) => (
                <ChatMessage key={index} message={message} />
              ))}
            </div>
          )}
          
          {/* Show error message if any */}
          {error && (
            <div className="p-3 bg-red-100 text-red-800 rounded-lg mx-auto max-w-md">
              {error}
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Container - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 max-w-2xl w-full mx-auto border-t border-textgpt-100/30 py-3 sm:py-4 px-3 sm:px-4 pb-4 sm:pb-6 bg-textgpt-200 rounded-b-lg">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-white/90 text-textgpt-200 placeholder:text-textgpt-200/70 focus:ring-textgpt-300 border-textgpt-100/30 focus:border-textgpt-300 h-10 text-sm sm:text-base sm:h-11"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-textgpt-300 hover:bg-textgpt-400 text-textgpt-200 h-10 sm:h-11"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 