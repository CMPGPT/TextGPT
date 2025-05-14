"use client";

import { useState, useRef, useEffect } from 'react';
import { useIQRChat, IQRMessage, Product } from '@/hooks/use-iqr-chat';
import { IQRChatMessage } from './IQRChatMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ShoppingBag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IQRChatProps {
  businessId: string;
}

export function IQRChat({ businessId }: IQRChatProps) {
  const {
    messages,
    input,
    products,
    selectedProduct,
    handleInputChange,
    handleProductSelect,
    handleSubmit,
    isLoading,
    error,
  } = useIQRChat(businessId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Set a default business ID for development
  const effectiveBusinessId = businessId || '11111111-1111-1111-1111-111111111111';
  
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
        
        {products.length > 1 && (
          <Select
            value={selectedProduct?.id}
            onValueChange={(value) => {
              const product = products.find(p => p.id === value);
              if (product) handleProductSelect(product);
            }}
          >
            <SelectTrigger className="w-[180px] bg-iqr-100 border-iqr-200/30 text-iqr-400">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent className="bg-iqr-100 border-iqr-200/30 text-iqr-400">
              {products.map((product) => (
                <SelectItem 
                  key={product.id} 
                  value={product.id}
                  className="focus:bg-iqr-200/20 focus:text-iqr-400"
                >
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Message Container - Scrollable area with flex-grow */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-iqr-400">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-xl font-semibold mb-2 text-iqr-400">Welcome to Product Chat</h2>
            <p className="max-w-md text-iqr-300">
              Start a conversation with our virtual assistant to learn more about
              {selectedProduct ? ` ${selectedProduct.name}` : ' our products'}.
            </p>
            {selectedProduct && (
              <div className="mt-6 bg-iqr-100/70 border border-iqr-200/30 rounded-lg p-4 max-w-md">
                <h3 className="font-semibold text-iqr-200 mb-2">{selectedProduct.name}</h3>
                <p className="text-iqr-300 text-sm">{selectedProduct.description}</p>
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
            placeholder="Ask about this product..."
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