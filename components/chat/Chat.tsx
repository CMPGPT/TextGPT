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
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between py-4 border-b text-black">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-black">TextGPT Chat</h1>
          {currentPersona && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              {currentPersona.name}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearChat}
          className={isConfirmingClear ? "bg-red-100 hover:bg-red-200 text-red-600" : ""}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isConfirmingClear ? "Confirm clear?" : "Clear chat"}
        </Button>
      </div>

      {/* Message Container */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 text-black flex flex-col">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <h2 className="text-xl font-semibold mb-2 text-black">Welcome to TextGPT</h2>
            <p className="max-w-md text-black">
              Start a conversation with the AI assistant. You can ask questions,
              request information, or just chat!
            </p>
            {currentPersona && (
              <p className="mt-4 text-sm text-black">
                Currently using: <span className="font-semibold">{currentPersona.name}</span>
                {currentPersona.short_desc && (
                  <span className="block mt-1">{currentPersona.short_desc}</span>
                )}
              </p>
            )}
            <p className="mt-6 text-xs text-black">
              Try asking about "available personas" or "switch to [persona name]"
              to change the assistant's personality!
            </p>
          </div>
        ) : (
          <div className="flex-1">
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

      {/* Input Container */}
      <div className="border-t py-4 mt-auto">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 text-black"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
} 