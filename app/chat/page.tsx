import { Chat } from '@/components/chat/Chat';

export const metadata = {
  title: 'Chat - TextGPT',
  description: 'Chat with AI assistant powered by GPT-4o',
};

export default function ChatPage() {
  return (
    <main className="flex h-full flex-col bg-white text-black overflow-hidden">
      <div className="flex-1 flex flex-col h-full">
        <Chat />
      </div>
    </main>
  );
} 