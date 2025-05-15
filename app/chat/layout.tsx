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
    <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 to-white">
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
} 