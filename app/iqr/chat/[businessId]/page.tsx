import { IQRChat } from '@/components/iqr/IQRChat';

export const metadata = {
  title: 'IQR - Smart Product Chat',
  description: 'Chat with the AI assistant about this product',
};

interface IQRChatPageProps {
  params: {
    businessId: string;
  };
}

export default function IQRChatPage({ params }: IQRChatPageProps) {
  return (
    <main className="flex h-screen w-full bg-iqr-100 text-iqr-400 overflow-hidden">
      <IQRChat businessId={params.businessId} />
    </main>
  );
} 