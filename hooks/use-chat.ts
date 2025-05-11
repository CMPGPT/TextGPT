"use client";

import { useState, useCallback, useEffect } from 'react';

// Types
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
}

export interface Persona {
  id: string;
  name: string;
  short_desc: string | null;
  active?: boolean;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);

  // Initialize userId from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      // Generate a new ID and store it
      const newUserId = crypto.randomUUID();
      localStorage.setItem('userId', newUserId);
      setUserId(newUserId);
    }
  }, []);

  // Fetch chat history when userId is available
  useEffect(() => {
    if (userId && !isInitialized) {
      fetchChatHistory();
      fetchCurrentPersona();
      setIsInitialized(true);
    }
  }, [userId, isInitialized]);

  // Fetch the user's chat history
  const fetchChatHistory = useCallback(async () => {
    try {
      console.log(`[CLIENT] Fetching chat history for user: ${userId}`);
      const response = await fetch(`/api/chat/history?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch chat history');
      
      const historyMessages = await response.json();
      
      if (historyMessages && historyMessages.length > 0) {
        console.log(`[CLIENT] Found ${historyMessages.length} messages in history`);
        
        // Convert from DB format to our Message format and filter out function messages
        const formattedMessages = historyMessages
          .filter((msg: any) => msg.role !== 'function')
          .map((msg: any) => ({
            role: msg.role as Message['role'],
            content: msg.content,
          }));
        
        setMessages(formattedMessages);
      } else {
        console.log(`[CLIENT] No chat history found for user: ${userId}`);
      }
    } catch (err) {
      console.error('[CLIENT] Error fetching chat history:', err);
    }
  }, [userId]);

  // Fetch the current persona for the user
  const fetchCurrentPersona = useCallback(async () => {
    try {
      const id = userId || localStorage.getItem('userId');
      if (!id) return;

      console.log(`[CLIENT] Fetching current persona for user: ${id}`);
      const response = await fetch(`/api/chat/personas?userId=${id}`);
      if (!response.ok) throw new Error('Failed to fetch current persona');
      
      const personas = await response.json();
      const activePersona = personas.find((p: Persona) => p.active);
      
      if (activePersona) {
        console.log(`[CLIENT] Current persona: ${activePersona.name}`);
        setCurrentPersona(activePersona);
      } else {
        console.log(`[CLIENT] No active persona found for user: ${id}`);
      }
    } catch (err) {
      console.error('[CLIENT] Error fetching current persona:', err);
    }
  }, [userId]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      // Add user message to the list
      const userMessage: Message = {
        role: 'user',
        content: input,
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setError(null);

      try {
        console.log(`[CLIENT] Sending message to API: ${input.substring(0, 50)}...`);
        // Send the message to our API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [userMessage],
            user_id: userId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        // The API now returns an AI-generated response
        const data = await response.text();
        console.log(`[CLIENT] Received AI response from API: ${data.substring(0, 50)}...`);
        
        // Add the assistant response to the list
        const assistantMessage: Message = {
          role: 'assistant',
          content: data,
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        
        // Check if a persona change might have happened
        const lowerData = data.toLowerCase();
        if (lowerData.includes('switched to') || 
            lowerData.includes('persona') ||
            lowerData.includes('changed to') ||
            lowerData.includes('as the') ||
            lowerData.includes('now using')) {
          console.log(`[CLIENT] Potential persona change detected, refreshing persona info`);
          await fetchCurrentPersona();
        }
      } catch (err) {
        console.error('[CLIENT] Error sending message:', err);
        setError('Failed to send message. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [input, userId, fetchCurrentPersona]
  );

  // Clear chat history
  const clearChatHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log(`[CLIENT] Clearing chat history for user: ${userId}`);
      const response = await fetch(`/api/chat/history?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      console.log(`[CLIENT] Chat history cleared successfully`);
      // Clear messages in state
      setMessages([]);
    } catch (err) {
      console.error('[CLIENT] Error clearing chat history:', err);
      setError('Failed to clear chat history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    currentPersona,
    clearChatHistory,
  };
} 