import { Metadata } from 'next';
import { ChatPageClient } from './client';

export const metadata: Metadata = {
  title: 'IQR - Smart Product Chat',
  description: 'Chat with the AI assistant about this product',
};

interface IQRChatPageProps {
  params: {
    businessId: string;
  };
}

export default function IQRChatPage({ params }: IQRChatPageProps) {
  return <ChatPageClient params={params} />;
} 