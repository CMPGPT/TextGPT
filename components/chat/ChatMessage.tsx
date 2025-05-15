"use client";

import ReactMarkdown from 'react-markdown';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  // Don't display function messages in the UI
  if (message.role === 'function') {
    return null;
  }
  
  const isUser = message.role === 'user';
  
  // Get the message content
  const content = message.content;

  return (
    <div className={cn("flex my-4", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[85%]", isUser ? "flex-row-reverse" : "flex-row")}>
        <Avatar className={cn("h-8 w-8 mt-1", isUser ? "ml-2" : "mr-2")}>
          <div className={cn("h-full w-full flex items-center justify-center rounded-full text-white", 
            isUser ? "bg-textgpt-100" : "bg-textgpt-300")}>
            {isUser ? 'U' : 'A'}
          </div>
        </Avatar>
        
        <div className={cn("p-3 shadow-sm rounded-xl", 
          isUser 
            ? "bg-textgpt-100 text-white border border-textgpt-100/30" 
            : "bg-white border border-textgpt-50/30")}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 