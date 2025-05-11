import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat - TextGPT',
  description: 'Interact with AI through natural conversation',
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b bg-white py-3 px-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <a href="/" className="text-xl font-bold">TextGPT</a>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
} 