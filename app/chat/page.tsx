import { Chat } from '@/components/chat/Chat';

export const metadata = {
  title: 'Chat - TextGPT',
  description: 'Chat with AI assistant powered by GPT-4o',
};

export default function ChatPage() {
  return (
    <main className="flex h-screen flex-col bg-gradient-to-br from-gray-50 to-white text-textgpt-200 overflow-hidden">
      <div className="flex-1 flex flex-col h-full">
        <Chat />
      </div>
    </main>
  );
} 